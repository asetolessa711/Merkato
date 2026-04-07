const crypto = require('crypto');

const EXTERNAL_ID_PREFIX = 'uid';
const EXTERNAL_ID_BODY_LENGTH = 20;
const EXTERNAL_ID_PATTERN = new RegExp(`^${EXTERNAL_ID_PREFIX}_[a-f0-9]{${EXTERNAL_ID_BODY_LENGTH}}$`);
const LEGACY_MONGO_ID_PATTERN = /^[a-f0-9]{24}$/;

function generateExternalId() {
  return `${EXTERNAL_ID_PREFIX}_${crypto.randomBytes(10).toString('hex')}`;
}

function isValidExternalId(value) {
  if (!value) return false;
  return EXTERNAL_ID_PATTERN.test(String(value).trim().toLowerCase());
}

function isLikelyMongoObjectId(value) {
  if (!value) return false;
  return LEGACY_MONGO_ID_PATTERN.test(String(value).trim().toLowerCase());
}

module.exports = {
  generateExternalId,
  isLikelyMongoObjectId,
  isValidExternalId,
};
