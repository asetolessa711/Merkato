const mongoose = require('mongoose');
const Order = require('../../../models/Order');
const Invoice = require('../../../models/Invoice');
const {
  generateInvoiceExternalId,
  generateOrderExternalId,
  isValidInvoiceExternalId,
  isValidOrderExternalId,
} = require('../../../utils/externalId');

describe('NEW order/invoice external-ID foundation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  test('generates valid canonical order and invoice external ID formats', () => {
    const orderExternalId = generateOrderExternalId();
    const invoiceExternalId = generateInvoiceExternalId();

    expect(isValidOrderExternalId(orderExternalId)).toBe(true);
    expect(orderExternalId.startsWith('oid_')).toBe(true);

    expect(isValidInvoiceExternalId(invoiceExternalId)).toBe(true);
    expect(invoiceExternalId.startsWith('iid_')).toBe(true);

    expect(isValidInvoiceExternalId(orderExternalId)).toBe(false);
    expect(isValidOrderExternalId(invoiceExternalId)).toBe(false);
  });

  test('assigns externalId during validation for new order and invoice documents', async () => {
    const order = new Order({
      buyer: new mongoose.Types.ObjectId(),
      total: 120,
    });
    const invoice = new Invoice({
      vendor: new mongoose.Types.ObjectId(),
      total: 120,
      netAmount: 108,
    });

    await order.validate();
    await invoice.validate();

    expect(order.externalId).toBeTruthy();
    expect(isValidOrderExternalId(order.externalId)).toBe(true);
    expect(order.getCanonicalIdentityKey()).toBe(order.externalId);

    expect(invoice.externalId).toBeTruthy();
    expect(isValidInvoiceExternalId(invoice.externalId)).toBe(true);
    expect(invoice.getCanonicalIdentityKey()).toBe(invoice.externalId);
  });

  test('hides canonical external IDs from serialized order and invoice payloads', async () => {
    const order = new Order({
      buyer: new mongoose.Types.ObjectId(),
      total: 75,
    });
    const invoice = new Invoice({
      vendor: new mongoose.Types.ObjectId(),
      total: 75,
      netAmount: 67,
    });

    await order.validate();
    await invoice.validate();

    expect(order.externalId).toBeTruthy();
    expect(invoice.externalId).toBeTruthy();

    const orderJson = order.toJSON();
    const invoiceJson = invoice.toJSON();

    expect(orderJson.externalId).toBeUndefined();
    expect(invoiceJson.externalId).toBeUndefined();
  });

  test('findByCanonicalIdentity prefers externalId and falls back to legacy _id for order and invoice', async () => {
    const orderExternalId = generateOrderExternalId();
    const invoiceExternalId = generateInvoiceExternalId();
    const orderLegacyId = new mongoose.Types.ObjectId().toString();
    const invoiceLegacyId = new mongoose.Types.ObjectId().toString();

    const orderFindOneSpy = jest.spyOn(Order, 'findOne').mockReturnValue('order-external-query');
    const orderFindByIdSpy = jest.spyOn(Order, 'findById').mockReturnValue('order-legacy-query');

    const invoiceFindOneSpy = jest.spyOn(Invoice, 'findOne').mockReturnValue('invoice-external-query');
    const invoiceFindByIdSpy = jest.spyOn(Invoice, 'findById').mockReturnValue('invoice-legacy-query');

    const orderByExternal = await Order.findByCanonicalIdentity(orderExternalId);
    expect(orderByExternal).toBe('order-external-query');
    expect(orderFindOneSpy).toHaveBeenCalledWith({ externalId: orderExternalId }, null, {});

    const orderByLegacy = await Order.findByCanonicalIdentity(orderLegacyId);
    expect(orderByLegacy).toBe('order-legacy-query');
    expect(orderFindByIdSpy).toHaveBeenCalledWith(orderLegacyId, null, {});

    const invoiceByExternal = await Invoice.findByCanonicalIdentity(invoiceExternalId);
    expect(invoiceByExternal).toBe('invoice-external-query');
    expect(invoiceFindOneSpy).toHaveBeenCalledWith({ externalId: invoiceExternalId }, null, {});

    const invoiceByLegacy = await Invoice.findByCanonicalIdentity(invoiceLegacyId);
    expect(invoiceByLegacy).toBe('invoice-legacy-query');
    expect(invoiceFindByIdSpy).toHaveBeenCalledWith(invoiceLegacyId, null, {});

    const invalidOrderIdentity = await Order.findByCanonicalIdentity('invalid-value');
    expect(invalidOrderIdentity).toBeNull();

    const invalidInvoiceIdentity = await Invoice.findByCanonicalIdentity('invalid-value');
    expect(invalidInvoiceIdentity).toBeNull();
  });

  test('retains backward-safe canonical identity fallback for legacy documents without externalId', () => {
    const legacyOrder = new Order({
      _id: new mongoose.Types.ObjectId(),
      buyer: new mongoose.Types.ObjectId(),
      total: 50,
    });
    const legacyInvoice = new Invoice({
      _id: new mongoose.Types.ObjectId(),
      vendor: new mongoose.Types.ObjectId(),
      total: 50,
      netAmount: 45,
    });

    legacyOrder.externalId = undefined;
    legacyInvoice.externalId = undefined;

    expect(legacyOrder.getCanonicalIdentityKey()).toBe(String(legacyOrder._id));
    expect(legacyInvoice.getCanonicalIdentityKey()).toBe(String(legacyInvoice._id));
  });

  test('rejects duplicate order externalId during validation', async () => {
    process.env.ORDER_EXTERNAL_ID_TEST_UNIQUENESS = 'true';

    const externalId = generateOrderExternalId();
    const existsSpy = jest.spyOn(Order, 'exists').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

    const order = new Order({
      buyer: new mongoose.Types.ObjectId(),
      total: 200,
      externalId,
    });

    await expect(order.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    await order.validate().catch((err) => {
      expect(err.errors.externalId.message).toMatch(/already in use/i);
    });

    expect(existsSpy).toHaveBeenCalledWith({
      externalId,
      _id: { $ne: order._id },
    });
  });

  test('rejects duplicate invoice externalId during validation', async () => {
    process.env.INVOICE_EXTERNAL_ID_TEST_UNIQUENESS = 'true';

    const externalId = generateInvoiceExternalId();
    const existsSpy = jest.spyOn(Invoice, 'exists').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

    const invoice = new Invoice({
      vendor: new mongoose.Types.ObjectId(),
      total: 200,
      netAmount: 170,
      externalId,
    });

    await expect(invoice.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    await invoice.validate().catch((err) => {
      expect(err.errors.externalId.message).toMatch(/already in use/i);
    });

    expect(existsSpy).toHaveBeenCalledWith({
      externalId,
      _id: { $ne: invoice._id },
    });
  });

  test('rejects attempted order and invoice externalId mutation after initial assignment', async () => {
    process.env.ORDER_EXTERNAL_ID_TEST_UNIQUENESS = 'true';
    process.env.INVOICE_EXTERNAL_ID_TEST_UNIQUENESS = 'true';
    jest.spyOn(Order, 'exists').mockResolvedValue(null);
    jest.spyOn(Invoice, 'exists').mockResolvedValue(null);

    const order = new Order({
      buyer: new mongoose.Types.ObjectId(),
      total: 99,
    });
    const invoice = new Invoice({
      vendor: new mongoose.Types.ObjectId(),
      total: 99,
      netAmount: 89,
    });

    await order.validate();
    await invoice.validate();

    order.isNew = false;
    invoice.isNew = false;

    order.externalId = generateOrderExternalId();
    invoice.externalId = generateInvoiceExternalId();

    await expect(order.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    await order.validate().catch((err) => {
      expect(err.errors.externalId.message).toMatch(/immutable/i);
    });

    await expect(invoice.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    await invoice.validate().catch((err) => {
      expect(err.errors.externalId.message).toMatch(/immutable/i);
    });
  });
});
