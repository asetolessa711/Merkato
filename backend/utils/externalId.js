const crypto = require('crypto');

const EXTERNAL_ID_PREFIX = 'uid';
const PRODUCT_EXTERNAL_ID_PREFIX = 'pid';
const ORDER_EXTERNAL_ID_PREFIX = 'oid';
const INVOICE_EXTERNAL_ID_PREFIX = 'iid';
const EXTERNAL_ID_BODY_LENGTH = 20;
const EXTERNAL_ID_PATTERN = new RegExp(`^${EXTERNAL_ID_PREFIX}_[a-f0-9]{${EXTERNAL_ID_BODY_LENGTH}}$`);
const PRODUCT_EXTERNAL_ID_PATTERN = new RegExp(
  `^${PRODUCT_EXTERNAL_ID_PREFIX}_[a-f0-9]{${EXTERNAL_ID_BODY_LENGTH}}$`
);
const ORDER_EXTERNAL_ID_PATTERN = new RegExp(
  `^${ORDER_EXTERNAL_ID_PREFIX}_[a-f0-9]{${EXTERNAL_ID_BODY_LENGTH}}$`
);
const INVOICE_EXTERNAL_ID_PATTERN = new RegExp(
  `^${INVOICE_EXTERNAL_ID_PREFIX}_[a-f0-9]{${EXTERNAL_ID_BODY_LENGTH}}$`
);
const LEGACY_MONGO_ID_PATTERN = /^[a-f0-9]{24}$/;

function generateExternalId() {
  return `${EXTERNAL_ID_PREFIX}_${crypto.randomBytes(10).toString('hex')}`;
}

function generateProductExternalId() {
  return `${PRODUCT_EXTERNAL_ID_PREFIX}_${crypto.randomBytes(10).toString('hex')}`;
}

function generateOrderExternalId() {
  return `${ORDER_EXTERNAL_ID_PREFIX}_${crypto.randomBytes(10).toString('hex')}`;
}

function generateInvoiceExternalId() {
  return `${INVOICE_EXTERNAL_ID_PREFIX}_${crypto.randomBytes(10).toString('hex')}`;
}

function generateVendorExternalId() {
  return generateExternalId();
}

function isValidExternalId(value) {
  if (!value) return false;
  return EXTERNAL_ID_PATTERN.test(String(value).trim().toLowerCase());
}

function isValidProductExternalId(value) {
  if (!value) return false;
  return PRODUCT_EXTERNAL_ID_PATTERN.test(String(value).trim().toLowerCase());
}

function isValidOrderExternalId(value) {
  if (!value) return false;
  return ORDER_EXTERNAL_ID_PATTERN.test(String(value).trim().toLowerCase());
}

function isValidInvoiceExternalId(value) {
  if (!value) return false;
  return INVOICE_EXTERNAL_ID_PATTERN.test(String(value).trim().toLowerCase());
}

function isValidVendorExternalId(value) {
  return isValidExternalId(value);
}

function isLikelyMongoObjectId(value) {
  if (!value) return false;
  return LEGACY_MONGO_ID_PATTERN.test(String(value).trim().toLowerCase());
}

module.exports = {
  generateExternalId,
  generateProductExternalId,
  generateOrderExternalId,
  generateInvoiceExternalId,
  generateVendorExternalId,
  isLikelyMongoObjectId,
  isValidExternalId,
  isValidProductExternalId,
  isValidOrderExternalId,
  isValidInvoiceExternalId,
  isValidVendorExternalId,
};
