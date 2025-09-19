const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Invoice = require('../../models/Invoice');
const User = require('../../models/User');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('Invoice Routes @invoices', () => {
  let vendor, vendorToken;
  let otherVendor, otherVendorToken;
  let admin, adminToken;
  let customer, customerToken;
  let invoice, orderId;

  beforeAll(async () => {
    const vendorReg = await registerTestUser({ country: 'ET', name: 'Vendor A' });
    const vendorLogin = await loginTestUser(vendorReg.email, 'Password123!');
    vendorToken = vendorLogin.token;
    vendor = await User.findById(vendorLogin.user._id || vendorLogin.user.id);

    const otherVendorReg = await registerTestUser({ country: 'ET', name: 'Vendor B' });
    const otherVendorLogin = await loginTestUser(otherVendorReg.email, 'Password123!');
    otherVendorToken = otherVendorLogin.token;
    otherVendor = await User.findById(otherVendorLogin.user._id || otherVendorLogin.user.id);

    const customerReg = await registerTestUser({ country: 'ET', name: 'Customer C' });
    const customerLogin = await loginTestUser(customerReg.email, 'Password123!');
    customerToken = customerLogin.token;
    customer = await User.findById(customerLogin.user._id || customerLogin.user.id);

    const adminReg = await registerTestUser({ country: 'ET', name: 'Admin D' });
    const adminLogin = await loginTestUser(adminReg.email, 'Password123!');
    adminToken = adminLogin.token;
    admin = await User.findById(adminLogin.user._id || adminLogin.user.id);
    await User.findByIdAndUpdate(admin._id, { $addToSet: { roles: 'admin' } });

    orderId = new mongoose.Types.ObjectId();
    invoice = await Invoice.create({
      vendor: vendor._id,
      customer: customer._id,
      order: orderId,
      items: [
        { name: 'Widget', quantity: 2, price: 10, subtotal: 20, tax: 2 }
      ],
      subtotal: 20,
      tax: 2,
      shipping: 5,
      discount: 1,
      commission: 3,
      total: 23,
      netAmount: 19,
      currency: 'USD'
    });
  });

  describe('GET /api/invoices/report', () => {
    it('returns vendor-only invoices for non-admin', async () => {
      const res = await request(app)
        .get('/api/invoices/report')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('invoices');
      const ids = (res.body.invoices || []).map((i) => String(i._id));
      expect(ids).toContain(String(invoice._id));
      (res.body.invoices || []).forEach((inv) => {
        expect(String(inv.vendor)).toBe(String(vendor._id));
      });
    });

    it('supports date filtering (future window returns zero)', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);
      const res = await request(app)
        .get(`/api/invoices/report?startDate=${date}&endDate=${date}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);
      expect(res.body.totalInvoices).toBe(0);
      expect(Array.isArray(res.body.invoices)).toBe(true);
    });

    it('returns all invoices for admin and includes seeded invoice', async () => {
      const res = await request(app)
        .get('/api/invoices/report')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const ids = (res.body.invoices || []).map((i) => String(i._id));
      expect(ids).toContain(String(invoice._id));
    });
  });

  describe('GET /api/invoices/download/:id', () => {
    it('404 when invoice id does not exist', async () => {
      const missingId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/invoices/download/${missingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('allows owner vendor to download PDF', async () => {
      const res = await request(app)
        .get(`/api/invoices/download/${invoice._id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    it('denies non-owner vendor with 403', async () => {
      await request(app)
        .get(`/api/invoices/download/${invoice._id}`)
        .set('Authorization', `Bearer ${otherVendorToken}`)
        .expect(403);
    });

    it('allows admin to download PDF', async () => {
      const res = await request(app)
        .get(`/api/invoices/download/${invoice._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });
  });

  describe('GET /api/invoices/:orderId', () => {
    it('400 for invalid orderId', async () => {
      await request(app)
        .get('/api/invoices/not-a-valid-id')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(400);
    });

    it('404 for valid but missing orderId', async () => {
      const missingOrderId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/invoices/${missingOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns invoice for owner vendor', async () => {
      const res = await request(app)
        .get(`/api/invoices/${orderId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);
      expect(String(res.body.order)).toBe(String(orderId));
      expect(String(res.body.vendor?._id || res.body.vendor)).toBe(String(vendor._id));
    });

    it('returns invoice for matching customer', async () => {
      const res = await request(app)
        .get(`/api/invoices/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      expect(String(res.body.order)).toBe(String(orderId));
      expect(String(res.body.customer?._id || res.body.customer)).toBe(String(customer._id));
    });

    it('forbids non-owner vendor with 403', async () => {
      await request(app)
        .get(`/api/invoices/${orderId}`)
        .set('Authorization', `Bearer ${otherVendorToken}`)
        .expect(403);
    });
  });

  describe('POST /api/invoices/email', () => {
    it('requires admin role', async () => {
      await request(app)
        .post('/api/invoices/email')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ orderId: String(orderId) })
        .expect(403);
    });

    it('400 when orderId missing', async () => {
      await request(app)
        .post('/api/invoices/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('400 when orderId invalid', async () => {
      await request(app)
        .post('/api/invoices/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ orderId: 'bad-id' })
        .expect(400);
    });

    it('404 when invoice not found', async () => {
      const missingOrderId = new mongoose.Types.ObjectId();
      await request(app)
        .post('/api/invoices/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ orderId: String(missingOrderId) })
        .expect(404);
    });

    it('200 or 202 when email accepted/sent', async () => {
      const res = await request(app)
        .post('/api/invoices/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ orderId: String(orderId) });
      expect([200, 202]).toContain(res.statusCode);
      expect(typeof res.body.message).toBe('string');
    });
  });
});
 
