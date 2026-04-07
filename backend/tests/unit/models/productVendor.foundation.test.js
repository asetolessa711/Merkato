const mongoose = require('mongoose');
const Product = require('../../../models/Product');
const User = require('../../../models/User');
const {
  generateExternalId,
  generateProductExternalId,
  generateVendorExternalId,
  isValidProductExternalId,
  isValidVendorExternalId,
} = require('../../../utils/externalId');

describe('NEW product/vendor foundation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  test('generates valid canonical product and vendor external ID formats', () => {
    const productExternalId = generateProductExternalId();
    const vendorExternalId = generateVendorExternalId();

    expect(isValidProductExternalId(productExternalId)).toBe(true);
    expect(productExternalId.startsWith('pid_')).toBe(true);

    expect(isValidVendorExternalId(vendorExternalId)).toBe(true);
    expect(vendorExternalId.startsWith('uid_')).toBe(true);

    expect(isValidProductExternalId(vendorExternalId)).toBe(false);
    expect(isValidVendorExternalId(productExternalId)).toBe(false);
  });

  test('assigns externalId during validation for new product documents', async () => {
    const product = new Product({
      name: `Foundation Product ${Date.now()}`,
      price: 25,
      vendor: new mongoose.Types.ObjectId(),
    });

    await product.validate();

    expect(product.externalId).toBeTruthy();
    expect(isValidProductExternalId(product.externalId)).toBe(true);
    expect(product.getCanonicalIdentityKey()).toBe(product.externalId);
  });

  test('Product.findByCanonicalIdentity prefers externalId and falls back to legacy _id', async () => {
    const productExternalId = generateProductExternalId();
    const legacyId = new mongoose.Types.ObjectId().toString();

    const findOneSpy = jest.spyOn(Product, 'findOne').mockReturnValue('product-external-query');
    const findByIdSpy = jest.spyOn(Product, 'findById').mockReturnValue('product-legacy-query');

    const byExternal = await Product.findByCanonicalIdentity(productExternalId);
    expect(byExternal).toBe('product-external-query');
    expect(findOneSpy).toHaveBeenCalledWith({ externalId: productExternalId }, null, {});

    const byLegacy = await Product.findByCanonicalIdentity(legacyId);
    expect(byLegacy).toBe('product-legacy-query');
    expect(findByIdSpy).toHaveBeenCalledWith(legacyId, null, {});

    const invalid = await Product.findByCanonicalIdentity('invalid-value');
    expect(invalid).toBeNull();
  });

  test('rejects duplicate product externalId during validation (uniqueness behavior)', async () => {
    process.env.PRODUCT_EXTERNAL_ID_TEST_UNIQUENESS = 'true';

    const externalId = generateProductExternalId();
    const existsSpy = jest.spyOn(Product, 'exists').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

    const product = new Product({
      name: `Duplicate Product ${Date.now()}`,
      price: 99,
      vendor: new mongoose.Types.ObjectId(),
      externalId,
    });

    await expect(product.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    await product.validate().catch((err) => {
      expect(err.errors.externalId.message).toMatch(/already in use/i);
    });

    expect(existsSpy).toHaveBeenCalledWith({
      externalId,
      _id: { $ne: product._id },
    });
  });

  test('rejects attempted product externalId mutation after initial assignment (immutability behavior)', async () => {
    process.env.PRODUCT_EXTERNAL_ID_TEST_UNIQUENESS = 'true';
    jest.spyOn(Product, 'exists').mockResolvedValue(null);

    const product = new Product({
      name: `Immutable Product ${Date.now()}`,
      price: 50,
      vendor: new mongoose.Types.ObjectId(),
    });
    await product.validate();

    product.isNew = false;
    product.externalId = generateProductExternalId();

    await expect(product.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    await product.validate().catch((err) => {
      expect(err.errors.externalId.message).toMatch(/immutable/i);
    });
  });

  test('User.findVendorByCanonicalIdentity limits canonical lookup to vendor role', async () => {
    const vendorExternalId = generateExternalId();
    const legacyId = new mongoose.Types.ObjectId().toString();

    const findOneSpy = jest.spyOn(User, 'findOne').mockReturnValue('vendor-query');

    const byExternal = await User.findVendorByCanonicalIdentity(vendorExternalId);
    expect(byExternal).toBe('vendor-query');
    expect(findOneSpy).toHaveBeenCalledWith({ externalId: vendorExternalId, roles: 'vendor' }, null, {});

    const byLegacy = await User.findVendorByCanonicalIdentity(legacyId);
    expect(byLegacy).toBe('vendor-query');
    expect(findOneSpy).toHaveBeenCalledWith({ _id: legacyId, roles: 'vendor' }, null, {});

    const invalid = await User.findVendorByCanonicalIdentity('invalid-value');
    expect(invalid).toBeNull();
  });

  test('getCanonicalVendorIdentityKey returns canonical key for vendor users only', () => {
    const vendorUser = new User({
      name: 'Vendor Foundation User',
      email: `vendor-foundation-${Date.now()}@example.com`,
      password: 'Password123!',
      country: 'ET',
      roles: ['vendor'],
    });

    vendorUser.externalId = generateExternalId();
    expect(vendorUser.getCanonicalVendorIdentityKey()).toBe(vendorUser.externalId);

    const nonVendorUser = new User({
      name: 'Customer Foundation User',
      email: `customer-foundation-${Date.now()}@example.com`,
      password: 'Password123!',
      country: 'ET',
      roles: ['customer'],
    });

    nonVendorUser.externalId = generateExternalId();
    expect(nonVendorUser.getCanonicalVendorIdentityKey()).toBeNull();
  });
});
