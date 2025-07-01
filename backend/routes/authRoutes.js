const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const ResetToken = require('../models/ResetToken');
const { protect, authorize } = require('../middleware/authMiddleware');
const { sendPasswordResetEmail, resetRateLimiter } = require('../utils/sendEmail');

const router = express.Router();

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// --- /api/auth/verify endpoint ---
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.json({ valid: false });

  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ valid: true });
  } catch {
    return res.json({ valid: false });
  }
});
// --- End /api/auth/verify ---

// Register (supports roles[])
router.post('/register', async (req, res) => {
  const { name, email, password, roles, country } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = await User.create({
      name,
      email,
      password,
      roles: roles || ['customer'],
      country
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.roles[0],
      roles: user.roles, // <-- Add roles array here too for consistency
      token: generateToken(user)
    });
  } catch (err) {
    console.error('Registration failed:', {
      error: err.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// Login (returns both role and roles)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.roles[0],
      roles: user.roles, // <-- Add this line!
      token: generateToken(user)
    });
  } catch (err) {
    console.error('Login failed:', {
      error: err.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// Get authenticated user data
router.get('/me', protect, (req, res) => {
  res.json({
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.roles[0],
      roles: req.user.roles // <-- Add roles array here too for consistency
    }
  });
});

// Admin-only route
router.get('/admin', protect, authorize('admin'), (req, res) => {
  res.json({ message: `Hello Admin ${req.user.name}` });
});

// Create global admin (development only)
router.post('/register-admin', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not available in production' });
  }

  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      roles: ['global_admin'],
      country: 'Global'
    });

    res.status(201).json({
      message: 'Admin created successfully',
      email: user.email,
      role: user.roles[0],
      roles: user.roles // <-- Add roles array here too for consistency
    });
  } catch (err) {
    console.error('Admin creation failed:', {
      error: err.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Failed to create admin' });
  }
});

// Enhanced Forgot Password with Rate Limiting
router.post('/forgot-password', resetRateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Security best practice - same response whether user exists or not
    const genericMessage = 'If account exists, a reset link will be sent.';
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: genericMessage });
    }

    // Generate and hash token
    const token = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    // Clear existing tokens and create new one in parallel
    await Promise.all([
      ResetToken.deleteMany({ userId: user._id }),
      ResetToken.create({
        userId: user._id,
        token: hashed,
        expiresAt: Date.now() + 3600000 // 1 hour
      })
    ]);

    // Send reset email
    await sendPasswordResetEmail({ 
      to: user.email, 
      token 
    });

    console.log(`Password reset requested for user: ${user._id}`);
    res.status(200).json({ message: genericMessage });
  } catch (err) {
    console.error('Password reset request failed:', {
      error: err.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: 'Unable to process request. Please try again later.' 
    });
  }
});

// Enhanced Reset Password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({ 
      message: 'Token and new password are required' 
    });
  }

  try {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    
    const reset = await ResetToken.findOne({ 
      token: hashed, 
      expiresAt: { $gt: Date.now() } 
    });

    if (!reset) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token' 
      });
    }

    const user = await User.findById(reset.userId).select('+password');
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    user.password = password; // Will be hashed by User model pre-save middleware
    await user.save();
    
    // Clean up all reset tokens
    await ResetToken.deleteMany({ userId: user._id });

    console.log(`Password reset successful for user: ${user._id}`);
    res.status(200).json({ 
      message: 'Password has been reset successfully' 
    });
  } catch (err) {
    console.error('Password reset failed:', {
      error: err.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: 'Unable to reset password. Please try again later.' 
    });
  }
});

module.exports = router;