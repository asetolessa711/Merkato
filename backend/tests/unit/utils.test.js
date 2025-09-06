

// Set dummy email credentials and mock nodemailer before any imports
process.env.EMAIL_USER = 'dummy@example.com';
process.env.EMAIL_PASS = 'dummy-password';


// Setup nodemailer mock and expose mock functions for assertions
const mockSendMail = jest.fn().mockResolvedValue({ accepted: ['user@example.com'] });
const mockVerify = jest.fn().mockResolvedValue(true);
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify
  }))
}));

const nodemailer = require('nodemailer');
const {
  sendOrderConfirmation,
  sendPasswordResetEmail,
  resetRateLimiter,
  testEmailConfig
} = require('../../utils/sendEmail');

describe('Email Utils', () => {

  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockSendMail.mockClear();
    mockVerify.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  test('sendOrderConfirmation sends a formatted email', async () => {
    const mockOrder = {
      _id: 'order123',
      currency: 'USD',
      total: 49.99,
      shippingAddress: '123 Example St',
      products: [
        { product: { name: 'Test Product' }, quantity: 2 }
      ]
    };

    const result = await sendOrderConfirmation({
      to: 'user@example.com',
      order: mockOrder
    });

    expect(mockVerify).toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
      subject: expect.stringContaining('Order Confirmation'),
      html: expect.stringContaining('Test Product')
    }));
    expect(result.accepted).toContain('user@example.com');
  });

  test('sendOrderConfirmation handles sendMail error and throws descriptive error', async () => {

    mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

    await expect(sendOrderConfirmation({
      to: 'user@example.com',
      order: {
        _id: 'order123',
        products: [],
        currency: 'USD',
        total: 0,
        shippingAddress: ''
      }
    })).rejects.toThrow('Failed to send email. Please try again later.');
  });

  test('sendPasswordResetEmail sends a reset email with token link', async () => {
    const result = await sendPasswordResetEmail({
      to: 'user@example.com',
      token: 'abc123'
    });

    expect(mockVerify).toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
      subject: expect.stringContaining('Reset'),
      html: expect.stringContaining('abc123')
    }));
    expect(result.accepted).toContain('user@example.com');
  });

  test('sendPasswordResetEmail handles sendMail error and throws descriptive error', async () => {

    mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

    await expect(sendPasswordResetEmail({
      to: 'user@example.com',
      token: 'abc123'
    })).rejects.toThrow('Failed to send email. Please try again later.');
  });

  test('testEmailConfig logs success in dev environment', async () => {
    process.env.NODE_ENV = 'development';

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await testEmailConfig();
    expect(mockVerify).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('verified'));

    logSpy.mockRestore();
  });

  test('resetRateLimiter is a middleware function', () => {
    expect(typeof resetRateLimiter).toBe('function');
  });

  // Note: Don't test resetRateLimiter behavior directly here — best tested in integration with Express routes
});
