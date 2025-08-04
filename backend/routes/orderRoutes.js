const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');
const Invoice = require('../models/Invoice');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/orders
 * @desc    Create multi-vendor order with invoices
 * @access  Private - Customers only
 */
router.post('/', protect, authorize('customer'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      cartItems,
      shippingAddress,
      paymentMethod,
      promoId,
      totalAfterDiscount,
      discount,
      deliveryOption
    } = req.body;

    const buyerId = req.user._id;

    // Enhanced input validation
    if (!cartItems?.length) {
      return res.status(400).json({ message: 'No products selected' });
    }
    if (!cartItems.every(item => item.quantity > 0)) {
      return res.status(400).json({ message: 'Invalid item quantity' });
    }
    if (!shippingAddress?.fullName || !shippingAddress?.city || !shippingAddress?.country) {
      return res.status(400).json({ message: 'Shipping address is incomplete' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }
    if (!deliveryOption?.name || !deliveryOption?.cost || !deliveryOption?.days) {
      return res.status(400).json({ message: 'Delivery option is missing' });
    }

    // Process promo code if provided
    let appliedPromo = null;
    if (promoId) {
      const promo = await PromoCode.findById(promoId).session(session);
      if (!promo?.isActive) {
        return res.status(400).json({ message: 'Invalid promo code' });
      }
      promo.usedCount += 1;
      await promo.save({ session });
      appliedPromo = promo._id;
    }

    // Fetch products and validate stock
    const productIds = cartItems.map(item => item.productId || item.product);
    const productsFromDB = await Product.find({ _id: { $in: productIds } })
      .populate('vendor', 'name email commission')
      .session(session);

    // Enhanced stock validation
    for (const item of cartItems) {
      const product = productsFromDB.find(p => 
        p._id.toString() === (item.productId || item.product).toString()
      );
      if (!product) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: `Product not found: ${item.productId}` 
        });
      }
      
      if (product.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }
    }

    // Calculate total items for shipping distribution
    const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Group items by vendor with improved handling
    const vendorMap = {};
    for (const item of cartItems) {
      const product = productsFromDB.find(p => 
        p._id.toString() === (item.productId || item.product).toString()
      );

      // Update stock atomically
      await Product.findByIdAndUpdate(
        product._id,
        { $inc: { stock: -item.quantity } },
        { session, new: true }
      );

      const vendorId = product.vendor._id.toString();
      const itemTotal = product.price * item.quantity;
      const itemTax = itemTotal * 0.15; // 15% tax rate

      if (!vendorMap[vendorId]) {
        vendorMap[vendorId] = {
          vendorId: product.vendor._id,
          vendorName: product.vendor.name,
          vendorEmail: product.vendor.email,
          products: [],
          subtotal: 0,
          tax: 0,
          shipping: 0,
          discount: 0,
          total: 0,
          commissionRate: product.vendor.commission || 0.1,
          commissionAmount: 0,
          netEarnings: 0,
          currency: 'USD',
          status: 'pending',
          deliveryStatus: 'processing'
        };
      }

      vendorMap[vendorId].products.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        subtotal: itemTotal,
        tax: itemTax
      });

      vendorMap[vendorId].subtotal += itemTotal;
      vendorMap[vendorId].tax += itemTax;
      vendorMap[vendorId].shipping += (item.quantity / totalItemCount) * deliveryOption.cost;
    }

    // Create invoices and calculate vendor totals
    const vendorArray = await Promise.all(Object.values(vendorMap).map(async (v) => {
      v.total = v.subtotal + v.tax + v.shipping - v.discount;
      v.commissionAmount = v.subtotal * v.commissionRate;
      v.netEarnings = v.total - v.commissionAmount;

      const invoice = new Invoice({
        vendor: v.vendorId,
        items: v.products,
        subtotal: v.subtotal,
        tax: v.tax,
        shipping: v.shipping,
        discount: v.discount,
        commission: v.commissionAmount,
        total: v.total,
        netAmount: v.netEarnings,
        currency: v.currency,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      const savedInvoice = await invoice.save({ session });
      v.invoiceId = savedInvoice._id;
      return v;
    }));

    const orderTotal = vendorArray.reduce((sum, v) => sum + v.total, 0);

    // Validate discount
    if (totalAfterDiscount && totalAfterDiscount > orderTotal) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Discount amount exceeds order total' 
      });
    }

// ...existing code...
    const order = new Order({
      buyer: buyerId,
      vendors: vendorArray,
      total: orderTotal,
      totalAfterDiscount: totalAfterDiscount || orderTotal,
      discount: discount || 0,
      promoCode: appliedPromo,
      currency: 'USD',
      paymentMethod,
      shippingAddress,
      deliveryOption,
      status: 'processing',
      orderDate: new Date()
    });

    const savedOrder = await order.save({ session });

    // Link invoices to order
    await Invoice.updateMany(
      { _id: { $in: vendorArray.map(v => v.invoiceId) } },
      { order: savedOrder._id },
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: savedOrder,
      invoices: vendorArray.map(v => ({
        vendorId: v.vendorId,
        invoiceId: v.invoiceId,
        amount: v.total
      }))
    });

  } catch (err) {
    await session.abortTransaction();
    let errorMessage = 'Failed to place order';
    if (err.name === 'ValidationError') {
      errorMessage = Object.values(err.errors).map(e => e.message).join(', ');
    } else if (err.code === 11000) {
      errorMessage = 'Duplicate order detected';
    }
    
    console.error('Order creation error:', err);
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: err.message
    });
  } finally {
    session.endSession();
  }
});

/**
 * @route   GET /api/orders/my-orders
 * @desc    Get all orders for current customer
 * @access  Private - Customer
 */
router.get('/my-orders', protect, authorize('customer'), async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate('vendors.vendorId', 'name')
      .sort('-createdAt');

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  Private - Order owner or vendor
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('vendors.vendorId', 'name email')
      .populate({ path: 'vendors.products.product', select: 'name price images', options: { strictPopulate: false } });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const isVendor = order.vendors.some(v => 
      v.vendorId._id.toString() === req.user._id.toString()
    );
    const isBuyer = order.buyer.toString() === req.user._id.toString();

    if (!isVendor && !isBuyer && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route   GET /api/orders/vendor-orders
 * @desc    Get all orders for current vendor
 * @access  Private - Vendor
 */
router.get('/vendor-orders', protect, authorize('vendor'), async (req, res) => {
  try {
    const orders = await Order.find({ 'vendors.vendorId': req.user._id })
      .populate('buyer', 'name email')
      .sort('-createdAt');

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route   PATCH /api/orders/:orderId/status
 * @desc    Update order status
 * @access  Private - Vendor and Admin
 */
router.patch('/:orderId/status', protect, authorize('vendor', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role === 'vendor') {
      const vendorSection = order.vendors.find(v => 
        v.vendorId.toString() === req.user._id.toString()
      );
      if (!vendorSection) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      vendorSection.status = status;
    } else {
      order.status = status;
    }

    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route   GET /api/orders/recent
 * @desc    Get recent 5 orders for customer
 * @access  Private - Customer only
 */
router.get('/recent', protect, authorize('customer'), async (req, res) => {
  try {
    console.log('[✅ /api/orders/recent] req.user:', req.user); // Log user info
    if (!req.user || !req.user._id) {
      console.error('[❌ /api/orders/recent] No user found on request');
      return res.status(401).json({ message: 'Unauthorized: No user found' });
    }
    const orders = await Order.find({ buyer: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    console.log('[✅ /api/orders/recent] Orders fetched:', orders.length);
    return res.status(200).json(orders);
  } catch (err) {
    console.error('[❌ /api/orders/recent] Error:', err); // Full error log
    return res.status(500).json({ message: 'Failed to fetch recent orders', error: err.message });
  }
});
module.exports = router;