const mongoose = require('mongoose');
const User = require('../../../models/User');
const {
  generateExternalId,
  isLikelyMongoObjectId,
  isValidExternalId,
} = require('../../../utils/externalId');

describe('NEW identity external-ID foundation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  test('generates a valid canonical externalId format', () => {
    const externalId = generateExternalId();
    expect(isValidExternalId(externalId)).toBe(true);
    expect(externalId.startsWith('uid_')).toBe(true);
  });

  test('recognizes legacy mongo object id shape', () => {
    const mongoId = new mongoose.Types.ObjectId().toString();
    expect(isLikelyMongoObjectId(mongoId)).toBe(true);
    expect(isLikelyMongoObjectId('not-a-mongo-id')).toBe(false);
  });

  test('assigns externalId during validation for new user documents', async () => {
    const user = new User({
      name: 'Identity Foundation User',
      email: `new-foundation-${Date.now()}@example.com`,
      password: 'Password123!',
      country: 'ET',
    });

    await user.validate();

    expect(user.externalId).toBeTruthy();
    expect(isValidExternalId(user.externalId)).toBe(true);
    expect(user.getCanonicalIdentityKey()).toBe(user.externalId);
  });

  test('findByCanonicalIdentity prefers externalId and falls back to legacy _id', async () => {
    const externalId = generateExternalId();
    const mongoId = new mongoose.Types.ObjectId().toString();

    const findOneSpy = jest.spyOn(User, 'findOne').mockReturnValue('external-query');
    const findByIdSpy = jest.spyOn(User, 'findById').mockReturnValue('legacy-query');

    const byExternal = await User.findByCanonicalIdentity(externalId);
    expect(byExternal).toBe('external-query');
    expect(findOneSpy).toHaveBeenCalledWith({ externalId }, null, {});

    const byLegacy = await User.findByCanonicalIdentity(mongoId);
    expect(byLegacy).toBe('legacy-query');
    expect(findByIdSpy).toHaveBeenCalledWith(mongoId, null, {});

    const invalid = await User.findByCanonicalIdentity('invalid-value');
    expect(invalid).toBeNull();
  });

  test('rejects duplicate externalId during validation (uniqueness behavior)', async () => {
    process.env.IDENTITY_EXTERNAL_ID_TEST_UNIQUENESS = 'true';

    const externalId = generateExternalId();
    const existsSpy = jest.spyOn(User, 'exists').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

    const user = new User({
      name: 'Duplicate ExternalId User',
      email: `duplicate-external-${Date.now()}@example.com`,
      password: 'Password123!',
      country: 'ET',
      externalId,
    });

    await expect(user.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    await user.validate().catch((err) => {
      expect(err.errors.externalId.message).toMatch(/already in use/i);
    });

    expect(existsSpy).toHaveBeenCalledWith({
      externalId,
      _id: { $ne: user._id },
    });
  });

  test('rejects attempted externalId mutation after initial assignment (immutability behavior)', async () => {
    process.env.IDENTITY_EXTERNAL_ID_TEST_UNIQUENESS = 'true';
    jest.spyOn(User, 'exists').mockResolvedValue(null);

    const user = new User({
      name: 'Immutable ExternalId User',
      email: `immutable-external-${Date.now()}@example.com`,
      password: 'Password123!',
      country: 'ET',
    });
    await user.validate();

    user.isNew = false;
    user.externalId = generateExternalId();

    await expect(user.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    await user.validate().catch((err) => {
      expect(err.errors.externalId.message).toMatch(/immutable/i);
    });
  });
});
