const { getPrismaClient } = require("../prisma/client");
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const Invoice = require("../models/Invoice");
const {
  isValidExternalId,
  isValidInvoiceExternalId,
  isValidOrderExternalId,
  isValidProductExternalId,
  isValidVendorExternalId,
} = require("../utils/externalId");

const VALID_MIRROR_MODES = new Set(["off", "best_effort"]);

function resolveOrdersPgMirrorMode() {
  const rawMode = String(process.env.ORDERS_PG_MIRROR_MODE || "").trim().toLowerCase();
  if (rawMode) {
    if (VALID_MIRROR_MODES.has(rawMode)) return rawMode;
    console.warn(`[orders-postgres-mirror] Invalid ORDERS_PG_MIRROR_MODE=\"${rawMode}\". Falling back to off.`);
    return "off";
  }

  // Backward-compatible alias while standardizing on ORDERS_PG_MIRROR_MODE.
  const enabledAlias = String(process.env.ORDERS_PG_MIRROR_ENABLED || "").toLowerCase() === "true";
  return enabledAlias ? "best_effort" : "off";
}

function toMoney(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0.00";
  return numeric.toFixed(2);
}

function toRate(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0.0000";
  return numeric.toFixed(4);
}

function toExchangeRate(value) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric.toFixed(6);
}

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function asJsonOrNull(value) {
  if (!value || typeof value !== "object") return null;
  return value;
}

function normalizeExternalId(value, validator) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  return validator(normalized) ? normalized : null;
}

function buildExternalIdLookup(documents, validator) {
  const lookup = new Map();
  const docs = Array.isArray(documents) ? documents : [];
  docs.forEach((doc) => {
    if (!doc || !doc._id) return;
    const normalizedExternalId = normalizeExternalId(doc.externalId, validator);
    if (!normalizedExternalId) return;
    lookup.set(String(doc._id), normalizedExternalId);
  });
  return lookup;
}

async function resolveBuyerExternalId(order) {
  const explicitBuyerExternalId = normalizeExternalId(
    order && (order.buyerExternalId || order.buyerCanonicalExternalId),
    isValidExternalId
  );
  if (explicitBuyerExternalId) return explicitBuyerExternalId;

  const buyerMongoId = order && order.buyer ? String(order.buyer) : "";
  if (!buyerMongoId) return null;

  try {
    const buyerDoc = await User.findById(buyerMongoId).select("_id externalId").lean();
    if (!buyerDoc) return null;
    return normalizeExternalId(buyerDoc.externalId, isValidExternalId);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.warn(`[orders-postgres-mirror] Canonical buyer identity enrichment fallback: ${message}`);
    return null;
  }
}

async function resolveOrderExternalId(order) {
  const explicitOrderExternalId = normalizeExternalId(
    order && (order.orderExternalId || order.orderCanonicalExternalId || order.externalId),
    isValidOrderExternalId
  );
  if (explicitOrderExternalId) return explicitOrderExternalId;

  const orderMongoId = order && order._id ? String(order._id) : "";
  if (!orderMongoId) return null;

  try {
    const orderDoc = await Order.findById(orderMongoId).select("_id externalId").lean();
    if (!orderDoc) return null;
    return normalizeExternalId(orderDoc.externalId, isValidOrderExternalId);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.warn(`[orders-postgres-mirror] Canonical order identity enrichment fallback: ${message}`);
    return null;
  }
}

async function enrichVendorsWithCanonicalIdentity(vendors) {
  const normalizedVendors = Array.isArray(vendors) ? vendors : [];
  if (normalizedVendors.length === 0) return [];

  const vendorMongoIds = Array.from(
    new Set(
      normalizedVendors
        .map((vendor) => (vendor && vendor.vendorId ? String(vendor.vendorId) : ""))
        .filter(Boolean)
    )
  );
  const productMongoIds = Array.from(
    new Set(
      normalizedVendors
        .flatMap((vendor) => (Array.isArray(vendor && vendor.products) ? vendor.products : []))
        .map((product) => (product && product.product ? String(product.product) : ""))
        .filter(Boolean)
    )
  );
  const invoiceMongoIds = Array.from(
    new Set(
      normalizedVendors
        .map((vendor) => (vendor && vendor.invoiceId ? String(vendor.invoiceId) : ""))
        .filter(Boolean)
    )
  );

  let vendorExternalIdLookup = new Map();
  let productExternalIdLookup = new Map();
  let invoiceExternalIdLookup = new Map();

  if (vendorMongoIds.length > 0 || productMongoIds.length > 0 || invoiceMongoIds.length > 0) {
    try {
      const [vendorDocs, productDocs, invoiceDocs] = await Promise.all([
        vendorMongoIds.length > 0
          ? User.find({ _id: { $in: vendorMongoIds } }).select("_id externalId").lean()
          : [],
        productMongoIds.length > 0
          ? Product.find({ _id: { $in: productMongoIds } }).select("_id externalId").lean()
          : [],
        invoiceMongoIds.length > 0
          ? Invoice.find({ _id: { $in: invoiceMongoIds } }).select("_id externalId").lean()
          : [],
      ]);

      vendorExternalIdLookup = buildExternalIdLookup(vendorDocs, isValidVendorExternalId);
      productExternalIdLookup = buildExternalIdLookup(productDocs, isValidProductExternalId);
      invoiceExternalIdLookup = buildExternalIdLookup(invoiceDocs, isValidInvoiceExternalId);
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      console.warn(`[orders-postgres-mirror] Canonical identity enrichment fallback: ${message}`);
    }
  }

  return normalizedVendors.map((vendor) => {
    const vendorMongoId = vendor && vendor.vendorId ? String(vendor.vendorId) : "";
    const invoiceMongoId = vendor && vendor.invoiceId ? String(vendor.invoiceId) : "";
    const explicitVendorExternalId = normalizeExternalId(
      vendor && (vendor.vendorExternalId || vendor.vendorCanonicalExternalId),
      isValidVendorExternalId
    );
    const explicitInvoiceExternalId = normalizeExternalId(
      vendor && (vendor.invoiceExternalId || vendor.invoiceCanonicalExternalId),
      isValidInvoiceExternalId
    );

    const products = Array.isArray(vendor && vendor.products) ? vendor.products : [];
    const enrichedProducts = products.map((product) => {
      const productMongoId = product && product.product ? String(product.product) : "";
      const explicitProductExternalId = normalizeExternalId(
        product && (product.productExternalId || product.productCanonicalExternalId),
        isValidProductExternalId
      );

      return {
        ...(product || {}),
        productExternalId: explicitProductExternalId || productExternalIdLookup.get(productMongoId) || null,
      };
    });

    return {
      ...(vendor || {}),
      vendorExternalId: explicitVendorExternalId || vendorExternalIdLookup.get(vendorMongoId) || null,
      invoiceExternalId: explicitInvoiceExternalId || invoiceExternalIdLookup.get(invoiceMongoId) || null,
      products: enrichedProducts,
    };
  });
}

function buildVendorRows(vendors) {
  if (!Array.isArray(vendors)) return [];

  return vendors.map((vendor) => {
    const products = Array.isArray(vendor.products) ? vendor.products : [];
    const invoiceMongoId = vendor.invoiceId ? String(vendor.invoiceId) : null;

    return {
      vendorMongoId: vendor.vendorId ? String(vendor.vendorId) : "",
      vendorExternalId: normalizeExternalId(vendor.vendorExternalId, isValidVendorExternalId),
      vendorName: vendor.vendorName || null,
      vendorEmail: vendor.vendorEmail || null,
      invoiceMongoId,
      invoiceExternalId: normalizeExternalId(vendor.invoiceExternalId, isValidInvoiceExternalId),
      subtotal: toMoney(vendor.subtotal),
      discount: toMoney(vendor.discount),
      tax: toMoney(vendor.tax),
      shipping: toMoney(vendor.shipping),
      total: toMoney(vendor.total),
      commissionRate: toRate(vendor.commissionRate),
      commissionAmount: toMoney(vendor.commissionAmount),
      netEarnings: toMoney(vendor.netEarnings),
      currency: vendor.currency || "USD",
      status: vendor.status || "pending",
      deliveryStatus: vendor.deliveryStatus || null,
      displayCurrency: vendor.displayCurrency || null,
      exchangeRate: toExchangeRate(vendor.exchangeRate),
      paidAt: toDate(vendor.paidAt),
      items: {
        create: products.map((product) => ({
          productMongoId: product.product ? String(product.product) : "",
          productExternalId: normalizeExternalId(product.productExternalId, isValidProductExternalId),
          name: product.name || null,
          quantity: Number(product.quantity || 0),
          price: toMoney(product.price),
          subtotal: toMoney(product.subtotal),
          tax: toMoney(product.tax),
        })),
      },
    };
  });
}

function buildMirrorSummary(order, vendors) {
  const normalizedVendors = Array.isArray(vendors) ? vendors : [];
  const itemCount = normalizedVendors.reduce((sum, vendor) => {
    const products = Array.isArray(vendor.products) ? vendor.products : [];
    return sum + products.length;
  }, 0);
  const invoiceCount = normalizedVendors.filter((vendor) => Boolean(vendor.invoiceId)).length;

  return {
    orderMongoId: order && order._id ? String(order._id) : null,
    total: toMoney(order && order.total),
    totalAfterDiscount: toMoney(order && order.totalAfterDiscount),
    discount: toMoney(order && order.discount),
    vendorCount: normalizedVendors.length,
    itemCount,
    invoiceCount,
  };
}

function summarizeMirroredOrder(mirroredOrder) {
  const vendors = Array.isArray(mirroredOrder && mirroredOrder.vendors) ? mirroredOrder.vendors : [];
  return {
    orderMongoId: mirroredOrder && mirroredOrder.mongoId ? String(mirroredOrder.mongoId) : null,
    total: toMoney(mirroredOrder && mirroredOrder.total),
    totalAfterDiscount: toMoney(mirroredOrder && mirroredOrder.totalAfterDiscount),
    discount: toMoney(mirroredOrder && mirroredOrder.discount),
    vendorCount: Number(mirroredOrder && mirroredOrder.vendorCount) || vendors.length,
    itemCount:
      Number(mirroredOrder && mirroredOrder.itemCount) ||
      vendors.reduce((sum, vendor) => sum + ((vendor.items || []).length), 0),
    invoiceCount:
      Number(mirroredOrder && mirroredOrder.invoiceCount) ||
      vendors.filter((vendor) => Boolean(vendor.invoiceMongoId)).length,
  };
}

function compareMirrorSummary(sourceSummary, mirroredSummary) {
  const discrepancies = [];
  const keys = ["total", "totalAfterDiscount", "discount", "vendorCount", "itemCount", "invoiceCount"];

  keys.forEach((key) => {
    if (String(sourceSummary[key]) !== String(mirroredSummary[key])) {
      discrepancies.push(`${key}:${sourceSummary[key]}->${mirroredSummary[key]}`);
    }
  });

  return discrepancies;
}

function compareCanonicalField({ label, expectedValue, actualValue, validator, discrepancies }) {
  const expected = normalizeExternalId(expectedValue, validator);
  const actualRaw = actualValue === null || actualValue === undefined ? null : String(actualValue).trim().toLowerCase();
  const actual = actualRaw && validator(actualRaw) ? actualRaw : null;

  if (expected) {
    if (actual !== expected) {
      discrepancies.push(`${label}:${expected}->${actualRaw || "null"}`);
    }
    return;
  }

  if (actualRaw && !validator(actualRaw)) {
    discrepancies.push(`${label}:invalid->${actualRaw}`);
  }
}

function compareCanonicalIdentityCompleteness(expectedData, mirroredOrder) {
  const discrepancies = [];

  compareCanonicalField({
    label: "orderExternalId",
    expectedValue: expectedData && expectedData.orderExternalId,
    actualValue: mirroredOrder && mirroredOrder.orderExternalId,
    validator: isValidOrderExternalId,
    discrepancies,
  });

  compareCanonicalField({
    label: "buyerExternalId",
    expectedValue: expectedData && expectedData.buyerExternalId,
    actualValue: mirroredOrder && mirroredOrder.buyerExternalId,
    validator: isValidExternalId,
    discrepancies,
  });

  const sourceVendors =
    expectedData && expectedData.vendors && Array.isArray(expectedData.vendors.create)
      ? expectedData.vendors.create
      : [];
  const mirroredVendors = Array.isArray(mirroredOrder && mirroredOrder.vendors) ? mirroredOrder.vendors : [];

  const mirroredBuckets = new Map();
  mirroredVendors.forEach((vendor) => {
    const key = `${String(vendor && vendor.vendorMongoId ? vendor.vendorMongoId : "")}::${
      String(vendor && vendor.invoiceMongoId ? vendor.invoiceMongoId : "")
    }`;
    const bucket = mirroredBuckets.get(key) || [];
    bucket.push(vendor || {});
    mirroredBuckets.set(key, bucket);
  });

  function takeVendorMatch(sourceVendorMongoId, sourceInvoiceMongoId) {
    const invoiceScopedKey = `${sourceVendorMongoId}::${sourceInvoiceMongoId}`;
    if (sourceInvoiceMongoId) {
      const exactBucket = mirroredBuckets.get(invoiceScopedKey) || [];
      return exactBucket.shift() || null;
    }

    for (const [bucketKey, bucket] of mirroredBuckets.entries()) {
      if (!Array.isArray(bucket) || bucket.length === 0) continue;
      const [bucketVendorMongoId] = String(bucketKey).split("::");
      if (bucketVendorMongoId === sourceVendorMongoId) {
        return bucket.shift() || null;
      }
    }

    return null;
  }

  sourceVendors.forEach((sourceVendor, vendorIndex) => {
    const sourceVendorMongoId = String(sourceVendor && sourceVendor.vendorMongoId ? sourceVendor.vendorMongoId : "");
    const sourceInvoiceMongoId = String(sourceVendor && sourceVendor.invoiceMongoId ? sourceVendor.invoiceMongoId : "");
    const sourceKey = `${sourceVendorMongoId}::${sourceInvoiceMongoId}`;
    const mirroredVendor = takeVendorMatch(sourceVendorMongoId, sourceInvoiceMongoId);

    if (!mirroredVendor) {
      discrepancies.push(`vendor[${vendorIndex}]:missing->${sourceKey}`);
      return;
    }

    compareCanonicalField({
      label: `vendor[${vendorIndex}].vendorExternalId`,
      expectedValue: sourceVendor && sourceVendor.vendorExternalId,
      actualValue: mirroredVendor.vendorExternalId,
      validator: isValidVendorExternalId,
      discrepancies,
    });

    compareCanonicalField({
      label: `vendor[${vendorIndex}].invoiceExternalId`,
      expectedValue: sourceVendor && sourceVendor.invoiceExternalId,
      actualValue: mirroredVendor.invoiceExternalId,
      validator: isValidInvoiceExternalId,
      discrepancies,
    });

    const sourceItems = sourceVendor && sourceVendor.items && Array.isArray(sourceVendor.items.create)
      ? sourceVendor.items.create
      : [];
    const mirroredItems = Array.isArray(mirroredVendor.items) ? mirroredVendor.items : [];
    const mirroredItemBuckets = new Map();

    mirroredItems.forEach((item) => {
      const productMongoId = String(item && item.productMongoId ? item.productMongoId : "");
      const bucket = mirroredItemBuckets.get(productMongoId) || [];
      bucket.push(item || {});
      mirroredItemBuckets.set(productMongoId, bucket);
    });

    sourceItems.forEach((sourceItem, itemIndex) => {
      const productMongoId = String(sourceItem && sourceItem.productMongoId ? sourceItem.productMongoId : "");
      const itemBucket = mirroredItemBuckets.get(productMongoId) || [];
      const mirroredItem = itemBucket.shift();

      if (!mirroredItem) {
        discrepancies.push(`vendor[${vendorIndex}].item[${itemIndex}]:missing->${productMongoId}`);
        return;
      }

      compareCanonicalField({
        label: `vendor[${vendorIndex}].item[${itemIndex}].productExternalId`,
        expectedValue: sourceItem && sourceItem.productExternalId,
        actualValue: mirroredItem.productExternalId,
        validator: isValidProductExternalId,
        discrepancies,
      });
    });
  });

  return discrepancies;
}

function compareShadowField({ label, expectedValue, actualValue, discrepancies }) {
  const expected = expectedValue === null || expectedValue === undefined ? "null" : String(expectedValue);
  const actual = actualValue === null || actualValue === undefined ? "null" : String(actualValue);
  if (expected !== actual) {
    discrepancies.push(`${label}:${expected}->${actual}`);
  }
}

function compareShadowNumericField({ label, expectedValue, actualValue, discrepancies }) {
  const expectedNumeric = Number(expectedValue);
  const actualNumeric = Number(actualValue);
  if (!Number.isFinite(expectedNumeric) || !Number.isFinite(actualNumeric)) {
    compareShadowField({ label, expectedValue, actualValue, discrepancies });
    return;
  }
  if (Math.abs(expectedNumeric - actualNumeric) > 0.000001) {
    discrepancies.push(`${label}:${expectedNumeric}->${actualNumeric}`);
  }
}

function compareOrderDetailShadowParity(expectedData, mirroredOrder, sourceOrderMongoId = null) {
  const discrepancies = [];

  const expectedOrderMongoId = sourceOrderMongoId ? String(sourceOrderMongoId) : null;
  const mirroredOrderMongoId = mirroredOrder && mirroredOrder.mongoId ? String(mirroredOrder.mongoId) : null;
  if (expectedOrderMongoId && expectedOrderMongoId !== mirroredOrderMongoId) {
    discrepancies.push(`orderMongoId:${expectedOrderMongoId}->${mirroredOrderMongoId || "null"}`);
  }

  compareShadowField({
    label: "buyerMongoId",
    expectedValue: expectedData && expectedData.buyerMongoId,
    actualValue: mirroredOrder && mirroredOrder.buyerMongoId,
    discrepancies,
  });
  compareShadowNumericField({
    label: "total",
    expectedValue: expectedData && expectedData.total,
    actualValue: mirroredOrder && mirroredOrder.total,
    discrepancies,
  });
  compareShadowNumericField({
    label: "totalAfterDiscount",
    expectedValue: expectedData && expectedData.totalAfterDiscount,
    actualValue: mirroredOrder && mirroredOrder.totalAfterDiscount,
    discrepancies,
  });
  compareShadowNumericField({
    label: "discount",
    expectedValue: expectedData && expectedData.discount,
    actualValue: mirroredOrder && mirroredOrder.discount,
    discrepancies,
  });

  compareCanonicalField({
    label: "orderExternalId",
    expectedValue: expectedData && expectedData.orderExternalId,
    actualValue: mirroredOrder && mirroredOrder.orderExternalId,
    validator: isValidOrderExternalId,
    discrepancies,
  });
  compareCanonicalField({
    label: "buyerExternalId",
    expectedValue: expectedData && expectedData.buyerExternalId,
    actualValue: mirroredOrder && mirroredOrder.buyerExternalId,
    validator: isValidExternalId,
    discrepancies,
  });

  const sourceVendors =
    expectedData && expectedData.vendors && Array.isArray(expectedData.vendors.create)
      ? expectedData.vendors.create
      : [];
  const mirroredVendors = Array.isArray(mirroredOrder && mirroredOrder.vendors) ? mirroredOrder.vendors : [];

  const mirroredInvoiceLinkCount = mirroredVendors.filter((vendor) => Boolean(vendor && vendor.invoiceMongoId)).length;
  compareShadowNumericField({
    label: "invoiceCountInvariant",
    expectedValue: mirroredOrder && mirroredOrder.invoiceCount,
    actualValue: mirroredInvoiceLinkCount,
    discrepancies,
  });

  const mirroredBuckets = new Map();
  mirroredVendors.forEach((vendor) => {
    const key = `${String(vendor && vendor.vendorMongoId ? vendor.vendorMongoId : "")}::${
      String(vendor && vendor.invoiceMongoId ? vendor.invoiceMongoId : "")
    }`;
    const bucket = mirroredBuckets.get(key) || [];
    bucket.push(vendor || {});
    mirroredBuckets.set(key, bucket);
  });

  function takeVendorMatch(sourceVendorMongoId, sourceInvoiceMongoId) {
    const invoiceScopedKey = `${sourceVendorMongoId}::${sourceInvoiceMongoId}`;
    if (sourceInvoiceMongoId) {
      const exactBucket = mirroredBuckets.get(invoiceScopedKey) || [];
      return exactBucket.shift() || null;
    }

    for (const [bucketKey, bucket] of mirroredBuckets.entries()) {
      if (!Array.isArray(bucket) || bucket.length === 0) continue;
      const [bucketVendorMongoId] = String(bucketKey).split("::");
      if (bucketVendorMongoId === sourceVendorMongoId) {
        return bucket.shift() || null;
      }
    }

    return null;
  }

  sourceVendors.forEach((sourceVendor, vendorIndex) => {
    const sourceVendorMongoId = String(sourceVendor && sourceVendor.vendorMongoId ? sourceVendor.vendorMongoId : "");
    const sourceInvoiceMongoId = String(sourceVendor && sourceVendor.invoiceMongoId ? sourceVendor.invoiceMongoId : "");
    const sourceKey = `${sourceVendorMongoId}::${sourceInvoiceMongoId}`;
    const mirroredVendor = takeVendorMatch(sourceVendorMongoId, sourceInvoiceMongoId);

    if (!mirroredVendor) {
      discrepancies.push(`vendor[${vendorIndex}]:missing->${sourceKey}`);
      return;
    }

    if (sourceInvoiceMongoId) {
      compareShadowField({
        label: `vendor[${vendorIndex}].invoiceMongoId`,
        expectedValue: sourceInvoiceMongoId,
        actualValue: mirroredVendor.invoiceMongoId,
        discrepancies,
      });
    }

    compareCanonicalField({
      label: `vendor[${vendorIndex}].vendorExternalId`,
      expectedValue: sourceVendor && sourceVendor.vendorExternalId,
      actualValue: mirroredVendor.vendorExternalId,
      validator: isValidVendorExternalId,
      discrepancies,
    });
    compareCanonicalField({
      label: `vendor[${vendorIndex}].invoiceExternalId`,
      expectedValue: sourceVendor && sourceVendor.invoiceExternalId,
      actualValue: mirroredVendor.invoiceExternalId,
      validator: isValidInvoiceExternalId,
      discrepancies,
    });

    ["subtotal", "discount", "tax", "total"].forEach((field) => {
      compareShadowNumericField({
        label: `vendor[${vendorIndex}].${field}`,
        expectedValue: sourceVendor && sourceVendor[field],
        actualValue: mirroredVendor && mirroredVendor[field],
        discrepancies,
      });
    });

    const sourceItems = sourceVendor && sourceVendor.items && Array.isArray(sourceVendor.items.create)
      ? sourceVendor.items.create
      : [];
    const mirroredItems = Array.isArray(mirroredVendor.items) ? mirroredVendor.items : [];
    const mirroredItemBuckets = new Map();

    mirroredItems.forEach((item) => {
      const productMongoId = String(item && item.productMongoId ? item.productMongoId : "");
      const bucket = mirroredItemBuckets.get(productMongoId) || [];
      bucket.push(item || {});
      mirroredItemBuckets.set(productMongoId, bucket);
    });

    sourceItems.forEach((sourceItem, itemIndex) => {
      const productMongoId = String(sourceItem && sourceItem.productMongoId ? sourceItem.productMongoId : "");
      const itemBucket = mirroredItemBuckets.get(productMongoId) || [];
      const mirroredItem = itemBucket.shift();

      if (!mirroredItem) {
        discrepancies.push(`vendor[${vendorIndex}].item[${itemIndex}]:missing->${productMongoId}`);
        return;
      }

      compareCanonicalField({
        label: `vendor[${vendorIndex}].item[${itemIndex}].productExternalId`,
        expectedValue: sourceItem && sourceItem.productExternalId,
        actualValue: mirroredItem.productExternalId,
        validator: isValidProductExternalId,
        discrepancies,
      });

      ["quantity"].forEach((field) => {
        compareShadowNumericField({
          label: `vendor[${vendorIndex}].item[${itemIndex}].${field}`,
          expectedValue: sourceItem && sourceItem[field],
          actualValue: mirroredItem && mirroredItem[field],
          discrepancies,
        });
      });
    });
  });

  return discrepancies;
}

function normalizeShadowSortTimestamp(value) {
  const parsed = toDate(value);
  if (!parsed) return 0;
  return parsed.getTime();
}

function buildSourceCustomerOrderListSummary(order) {
  const vendors = Array.isArray(order && order.vendors) ? order.vendors : [];
  const itemCount = vendors.reduce((sum, vendor) => {
    const products = Array.isArray(vendor && vendor.products) ? vendor.products : [];
    return sum + products.length;
  }, 0);

  return {
    orderMongoId: order && order._id ? String(order._id) : "",
    orderExternalId: normalizeExternalId(
      order && (order.externalId || order.orderExternalId || order.orderCanonicalExternalId),
      isValidOrderExternalId
    ),
    buyerMongoId: order && order.buyer ? String(order.buyer) : "",
    status: order && order.status ? String(order.status) : "pending",
    currency: order && order.currency ? String(order.currency) : "USD",
    total: toMoney(order && order.total),
    totalAfterDiscount: toMoney(order && order.totalAfterDiscount),
    discount: toMoney(order && order.discount),
    vendorCount: vendors.length,
    itemCount,
    sortTimestamp: normalizeShadowSortTimestamp(order && order.createdAt),
  };
}

function buildMirroredCustomerOrderListSummary(order) {
  const vendors = Array.isArray(order && order.vendors) ? order.vendors : [];
  const derivedVendorCount = vendors.length;
  const derivedItemCount = vendors.reduce((sum, vendor) => {
    const items = Array.isArray(vendor && vendor.items) ? vendor.items : [];
    return sum + items.length;
  }, 0);

  const vendorCountRaw = Number(order && order.vendorCount);
  const itemCountRaw = Number(order && order.itemCount);
  const vendorCount = Number.isFinite(vendorCountRaw) ? vendorCountRaw : derivedVendorCount;
  const itemCount = Number.isFinite(itemCountRaw) ? itemCountRaw : derivedItemCount;

  return {
    orderMongoId: order && order.mongoId ? String(order.mongoId) : "",
    orderExternalId: normalizeExternalId(order && order.orderExternalId, isValidOrderExternalId),
    buyerMongoId: order && order.buyerMongoId ? String(order.buyerMongoId) : "",
    status: order && order.status ? String(order.status) : "pending",
    currency: order && order.currency ? String(order.currency) : "USD",
    total: toMoney(order && order.total),
    totalAfterDiscount: toMoney(order && order.totalAfterDiscount),
    discount: toMoney(order && order.discount),
    vendorCount,
    itemCount,
    sortTimestamp: normalizeShadowSortTimestamp(
      order && (order.sourceCreatedAt || order.createdAt || order.orderDate || order.mirroredAt)
    ),
  };
}

function buildSourceAdminOrderListSummary(order) {
  const vendors = Array.isArray(order && order.vendors) ? order.vendors : [];
  const itemCount = vendors.reduce((sum, vendor) => {
    const products = Array.isArray(vendor && vendor.products) ? vendor.products : [];
    return sum + products.length;
  }, 0);
  const invoiceCount = vendors.reduce((sum, vendor) => sum + (vendor && vendor.invoiceId ? 1 : 0), 0);

  return {
    orderMongoId: order && order._id ? String(order._id) : "",
    orderExternalId: normalizeExternalId(
      order && (order.externalId || order.orderExternalId || order.orderCanonicalExternalId),
      isValidOrderExternalId
    ),
    buyerMongoId: order && order.buyer ? String(order.buyer) : "",
    buyerExternalId: normalizeExternalId(
      order && (order.buyerExternalId || order.buyerCanonicalExternalId),
      isValidExternalId
    ),
    status: order && order.status ? String(order.status) : "pending",
    currency: order && order.currency ? String(order.currency) : "USD",
    paymentMethod: order && order.paymentMethod ? String(order.paymentMethod) : "cod",
    total: toMoney(order && order.total),
    totalAfterDiscount: toMoney(order && order.totalAfterDiscount),
    discount: toMoney(order && order.discount),
    vendorCount: vendors.length,
    itemCount,
    invoiceCount,
    sortTimestamp: normalizeShadowSortTimestamp(order && order.createdAt),
  };
}

function buildMirroredAdminOrderListSummary(order) {
  const vendors = Array.isArray(order && order.vendors) ? order.vendors : [];
  const derivedVendorCount = vendors.length;
  const derivedItemCount = vendors.reduce((sum, vendor) => {
    const items = Array.isArray(vendor && vendor.items) ? vendor.items : [];
    return sum + items.length;
  }, 0);
  const derivedInvoiceCount = vendors.reduce((sum, vendor) => sum + (vendor && vendor.invoiceMongoId ? 1 : 0), 0);

  const vendorCountRaw = Number(order && order.vendorCount);
  const itemCountRaw = Number(order && order.itemCount);
  const invoiceCountRaw = Number(order && order.invoiceCount);
  const vendorCount = Number.isFinite(vendorCountRaw) ? vendorCountRaw : derivedVendorCount;
  const itemCount = Number.isFinite(itemCountRaw) ? itemCountRaw : derivedItemCount;
  const invoiceCount = Number.isFinite(invoiceCountRaw) ? invoiceCountRaw : derivedInvoiceCount;

  return {
    orderMongoId: order && order.mongoId ? String(order.mongoId) : "",
    orderExternalId: normalizeExternalId(order && order.orderExternalId, isValidOrderExternalId),
    buyerMongoId: order && order.buyerMongoId ? String(order.buyerMongoId) : "",
    buyerExternalId: normalizeExternalId(order && order.buyerExternalId, isValidExternalId),
    status: order && order.status ? String(order.status) : "pending",
    currency: order && order.currency ? String(order.currency) : "USD",
    paymentMethod: order && order.paymentMethod ? String(order.paymentMethod) : "cod",
    total: toMoney(order && order.total),
    totalAfterDiscount: toMoney(order && order.totalAfterDiscount),
    discount: toMoney(order && order.discount),
    vendorCount,
    itemCount,
    invoiceCount,
    sortTimestamp: normalizeShadowSortTimestamp(
      order && (order.sourceCreatedAt || order.createdAt || order.orderDate || order.mirroredAt)
    ),
  };
}

function compareAdminOrderListSummaryShadowParity(sourceOrders, mirroredOrders) {
  const discrepancies = [];

  const sourceSummaries = (Array.isArray(sourceOrders) ? sourceOrders : [])
    .map((order) => buildSourceAdminOrderListSummary(order))
    .filter((summary) => summary.orderMongoId);

  const mirroredSummaries = (Array.isArray(mirroredOrders) ? mirroredOrders : [])
    .map((order) => buildMirroredAdminOrderListSummary(order))
    .filter((summary) => summary.orderMongoId);

  const sourceById = new Map();
  sourceSummaries.forEach((summary) => {
    sourceById.set(summary.orderMongoId, summary);
  });

  const mirroredById = new Map();
  mirroredSummaries.forEach((summary) => {
    mirroredById.set(summary.orderMongoId, summary);
  });

  const coveredSummaries = [];
  sourceById.forEach((sourceSummary, orderMongoId) => {
    const mirroredSummary = mirroredById.get(orderMongoId);
    if (!mirroredSummary) return;
    coveredSummaries.push({ sourceSummary, mirroredSummary });
  });

  if (coveredSummaries.length === 0) {
    return discrepancies;
  }

  const sortedSource = coveredSummaries
    .map((entry) => entry.sourceSummary)
    .sort((left, right) => {
      if (right.sortTimestamp !== left.sortTimestamp) return right.sortTimestamp - left.sortTimestamp;
      return String(right.orderMongoId).localeCompare(String(left.orderMongoId));
    });
  const sortedMirrored = coveredSummaries
    .map((entry) => entry.mirroredSummary)
    .sort((left, right) => {
      if (right.sortTimestamp !== left.sortTimestamp) return right.sortTimestamp - left.sortTimestamp;
      return String(right.orderMongoId).localeCompare(String(left.orderMongoId));
    });

  const expectedOrder = sortedSource.map((entry) => entry.orderMongoId);
  const actualOrder = sortedMirrored.map((entry) => entry.orderMongoId);
  if (expectedOrder.join("|") !== actualOrder.join("|")) {
    discrepancies.push(`ordering:${expectedOrder.join("|")}->${actualOrder.join("|")}`);
  }

  sortedSource.forEach((sourceSummary, index) => {
    const mirroredSummary = mirroredById.get(sourceSummary.orderMongoId);
    if (!mirroredSummary) return;

    compareCanonicalField({
      label: `order[${index}].orderExternalId`,
      expectedValue: sourceSummary.orderExternalId,
      actualValue: mirroredSummary.orderExternalId,
      validator: isValidOrderExternalId,
      discrepancies,
    });
    compareCanonicalField({
      label: `order[${index}].buyerExternalId`,
      expectedValue: sourceSummary.buyerExternalId,
      actualValue: mirroredSummary.buyerExternalId,
      validator: isValidExternalId,
      discrepancies,
    });

    compareShadowField({
      label: `order[${index}].buyerMongoId`,
      expectedValue: sourceSummary.buyerMongoId,
      actualValue: mirroredSummary.buyerMongoId,
      discrepancies,
    });
    compareShadowField({
      label: `order[${index}].status`,
      expectedValue: sourceSummary.status,
      actualValue: mirroredSummary.status,
      discrepancies,
    });
    compareShadowField({
      label: `order[${index}].currency`,
      expectedValue: sourceSummary.currency,
      actualValue: mirroredSummary.currency,
      discrepancies,
    });
    compareShadowField({
      label: `order[${index}].paymentMethod`,
      expectedValue: sourceSummary.paymentMethod,
      actualValue: mirroredSummary.paymentMethod,
      discrepancies,
    });

    ["total", "totalAfterDiscount", "discount", "vendorCount", "itemCount", "invoiceCount"].forEach((field) => {
      compareShadowNumericField({
        label: `order[${index}].${field}`,
        expectedValue: sourceSummary[field],
        actualValue: mirroredSummary[field],
        discrepancies,
      });
    });
  });

  return discrepancies;
}

function normalizeVendorMongoId(value) {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

function sumVendorNumeric(vendors, field) {
  return vendors.reduce((sum, vendor) => {
    const numeric = Number(vendor && vendor[field]);
    return Number.isFinite(numeric) ? sum + numeric : sum;
  }, 0);
}

function resolveSourceVendorShipping(vendor) {
  const explicit = Number(vendor && vendor.shipping);
  if (Number.isFinite(explicit)) return explicit;

  const subtotal = Number(vendor && vendor.subtotal);
  const tax = Number(vendor && vendor.tax);
  const discount = Number(vendor && vendor.discount);
  const total = Number(vendor && vendor.total);

  if (
    Number.isFinite(subtotal) &&
    Number.isFinite(tax) &&
    Number.isFinite(discount) &&
    Number.isFinite(total)
  ) {
    const derived = total - subtotal - tax + discount;
    if (Number.isFinite(derived)) return Math.abs(derived) < 0.000001 ? 0 : derived;
  }

  return 0;
}

function sumSourceVendorShipping(vendors) {
  return vendors.reduce((sum, vendor) => sum + resolveSourceVendorShipping(vendor), 0);
}

function pickFirstCanonicalVendorExternalId(vendors) {
  for (const vendor of vendors) {
    const normalized = normalizeExternalId(
      vendor && (vendor.vendorExternalId || vendor.vendorCanonicalExternalId),
      isValidVendorExternalId
    );
    if (normalized) return normalized;
  }
  return null;
}

function buildSourceVendorOrderListSummary(order, vendorMongoId = null) {
  const vendorScope = vendorMongoId ? String(vendorMongoId) : null;
  const vendors = Array.isArray(order && order.vendors) ? order.vendors : [];
  const scopedVendors = vendors.filter((vendor) => {
    if (!vendorScope) return true;
    return normalizeVendorMongoId(vendor && vendor.vendorId) === vendorScope;
  });

  if (scopedVendors.length === 0) return null;

  const firstVendor = scopedVendors[0] || {};
  const itemCount = scopedVendors.reduce((sum, vendor) => {
    const products = Array.isArray(vendor && vendor.products) ? vendor.products : [];
    return sum + products.length;
  }, 0);

  return {
    orderMongoId: order && order._id ? String(order._id) : "",
    orderExternalId: normalizeExternalId(
      order && (order.externalId || order.orderExternalId || order.orderCanonicalExternalId),
      isValidOrderExternalId
    ),
    vendorMongoId: vendorScope || normalizeVendorMongoId(firstVendor.vendorId),
    vendorExternalId: pickFirstCanonicalVendorExternalId(scopedVendors),
    status: firstVendor && firstVendor.status ? String(firstVendor.status) : (order && order.status ? String(order.status) : "pending"),
    currency: firstVendor && firstVendor.currency ? String(firstVendor.currency) : (order && order.currency ? String(order.currency) : "USD"),
    subtotal: toMoney(sumVendorNumeric(scopedVendors, "subtotal")),
    discount: toMoney(sumVendorNumeric(scopedVendors, "discount")),
    tax: toMoney(sumVendorNumeric(scopedVendors, "tax")),
    shipping: toMoney(sumSourceVendorShipping(scopedVendors)),
    total: toMoney(sumVendorNumeric(scopedVendors, "total")),
    commissionAmount: toMoney(sumVendorNumeric(scopedVendors, "commissionAmount")),
    netEarnings: toMoney(sumVendorNumeric(scopedVendors, "netEarnings")),
    itemCount,
    sortTimestamp: normalizeShadowSortTimestamp(order && order.createdAt),
  };
}

function buildMirroredVendorOrderListSummary(order, vendorMongoId = null) {
  const vendorScope = vendorMongoId ? String(vendorMongoId) : null;
  const vendors = Array.isArray(order && order.vendors) ? order.vendors : [];
  const scopedVendors = vendors.filter((vendor) => {
    if (!vendorScope) return true;
    return normalizeVendorMongoId(vendor && vendor.vendorMongoId) === vendorScope;
  });

  if (scopedVendors.length === 0) return null;

  const firstVendor = scopedVendors[0] || {};
  const itemCount = scopedVendors.reduce((sum, vendor) => {
    const items = Array.isArray(vendor && vendor.items) ? vendor.items : [];
    return sum + items.length;
  }, 0);

  return {
    orderMongoId: order && order.mongoId ? String(order.mongoId) : "",
    orderExternalId: normalizeExternalId(order && order.orderExternalId, isValidOrderExternalId),
    vendorMongoId: vendorScope || normalizeVendorMongoId(firstVendor.vendorMongoId),
    vendorExternalId: pickFirstCanonicalVendorExternalId(scopedVendors),
    status: firstVendor && firstVendor.status ? String(firstVendor.status) : (order && order.status ? String(order.status) : "pending"),
    currency: firstVendor && firstVendor.currency ? String(firstVendor.currency) : (order && order.currency ? String(order.currency) : "USD"),
    subtotal: toMoney(sumVendorNumeric(scopedVendors, "subtotal")),
    discount: toMoney(sumVendorNumeric(scopedVendors, "discount")),
    tax: toMoney(sumVendorNumeric(scopedVendors, "tax")),
    shipping: toMoney(sumVendorNumeric(scopedVendors, "shipping")),
    total: toMoney(sumVendorNumeric(scopedVendors, "total")),
    commissionAmount: toMoney(sumVendorNumeric(scopedVendors, "commissionAmount")),
    netEarnings: toMoney(sumVendorNumeric(scopedVendors, "netEarnings")),
    itemCount,
    sortTimestamp: normalizeShadowSortTimestamp(
      order && (order.sourceCreatedAt || order.createdAt || order.orderDate || order.mirroredAt)
    ),
  };
}

function compareVendorOrderListSummaryShadowParity(sourceOrders, mirroredOrders, vendorMongoId = null) {
  const discrepancies = [];
  const vendorScope = vendorMongoId ? String(vendorMongoId) : null;

  const sourceSummaries = (Array.isArray(sourceOrders) ? sourceOrders : [])
    .map((order) => buildSourceVendorOrderListSummary(order, vendorScope))
    .filter((summary) => summary && summary.orderMongoId)
    .filter((summary) => !vendorScope || summary.vendorMongoId === vendorScope);

  const mirroredSummaries = (Array.isArray(mirroredOrders) ? mirroredOrders : [])
    .map((order) => buildMirroredVendorOrderListSummary(order, vendorScope))
    .filter((summary) => summary && summary.orderMongoId)
    .filter((summary) => !vendorScope || summary.vendorMongoId === vendorScope);

  const sourceById = new Map();
  sourceSummaries.forEach((summary) => {
    sourceById.set(summary.orderMongoId, summary);
  });

  const mirroredById = new Map();
  mirroredSummaries.forEach((summary) => {
    mirroredById.set(summary.orderMongoId, summary);
  });

  const coveredSummaries = [];
  sourceById.forEach((sourceSummary, orderMongoId) => {
    const mirroredSummary = mirroredById.get(orderMongoId);
    if (!mirroredSummary) return;
    coveredSummaries.push({ sourceSummary, mirroredSummary });
  });

  if (coveredSummaries.length === 0) {
    return discrepancies;
  }

  const sortedSource = coveredSummaries
    .map((entry) => entry.sourceSummary)
    .sort((left, right) => {
      if (right.sortTimestamp !== left.sortTimestamp) return right.sortTimestamp - left.sortTimestamp;
      return String(right.orderMongoId).localeCompare(String(left.orderMongoId));
    });
  const sortedMirrored = coveredSummaries
    .map((entry) => entry.mirroredSummary)
    .sort((left, right) => {
      if (right.sortTimestamp !== left.sortTimestamp) return right.sortTimestamp - left.sortTimestamp;
      return String(right.orderMongoId).localeCompare(String(left.orderMongoId));
    });

  const expectedOrder = sortedSource.map((entry) => entry.orderMongoId);
  const actualOrder = sortedMirrored.map((entry) => entry.orderMongoId);
  if (expectedOrder.join("|") !== actualOrder.join("|")) {
    discrepancies.push(`ordering:${expectedOrder.join("|")}->${actualOrder.join("|")}`);
  }

  sortedSource.forEach((sourceSummary, index) => {
    const mirroredSummary = mirroredById.get(sourceSummary.orderMongoId);
    if (!mirroredSummary) return;

    compareCanonicalField({
      label: `order[${index}].orderExternalId`,
      expectedValue: sourceSummary.orderExternalId,
      actualValue: mirroredSummary.orderExternalId,
      validator: isValidOrderExternalId,
      discrepancies,
    });
    compareCanonicalField({
      label: `order[${index}].vendorExternalId`,
      expectedValue: sourceSummary.vendorExternalId,
      actualValue: mirroredSummary.vendorExternalId,
      validator: isValidVendorExternalId,
      discrepancies,
    });

    compareShadowField({
      label: `order[${index}].vendorMongoId`,
      expectedValue: sourceSummary.vendorMongoId,
      actualValue: mirroredSummary.vendorMongoId,
      discrepancies,
    });
    compareShadowField({
      label: `order[${index}].status`,
      expectedValue: sourceSummary.status,
      actualValue: mirroredSummary.status,
      discrepancies,
    });
    compareShadowField({
      label: `order[${index}].currency`,
      expectedValue: sourceSummary.currency,
      actualValue: mirroredSummary.currency,
      discrepancies,
    });

    ["subtotal", "discount", "tax", "shipping", "total", "commissionAmount", "netEarnings", "itemCount"].forEach((field) => {
      compareShadowNumericField({
        label: `order[${index}].${field}`,
        expectedValue: sourceSummary[field],
        actualValue: mirroredSummary[field],
        discrepancies,
      });
    });
  });

  return discrepancies;
}

function compareCustomerOrderListSummaryShadowParity(sourceOrders, mirroredOrders, buyerMongoId = null) {
  const discrepancies = [];
  const buyerScope = buyerMongoId ? String(buyerMongoId) : null;

  const sourceSummaries = (Array.isArray(sourceOrders) ? sourceOrders : [])
    .map((order) => buildSourceCustomerOrderListSummary(order))
    .filter((summary) => summary.orderMongoId)
    .filter((summary) => !buyerScope || summary.buyerMongoId === buyerScope);

  const mirroredSummaries = (Array.isArray(mirroredOrders) ? mirroredOrders : [])
    .map((order) => buildMirroredCustomerOrderListSummary(order))
    .filter((summary) => summary.orderMongoId)
    .filter((summary) => !buyerScope || summary.buyerMongoId === buyerScope);

  const sourceById = new Map();
  sourceSummaries.forEach((summary) => {
    sourceById.set(summary.orderMongoId, summary);
  });

  const mirroredById = new Map();
  mirroredSummaries.forEach((summary) => {
    mirroredById.set(summary.orderMongoId, summary);
  });

  const coveredSummaries = [];
  sourceById.forEach((sourceSummary, orderMongoId) => {
    const mirroredSummary = mirroredById.get(orderMongoId);
    if (!mirroredSummary) return;
    coveredSummaries.push({ sourceSummary, mirroredSummary });
  });

  if (coveredSummaries.length === 0) {
    return discrepancies;
  }

  const sortedSource = coveredSummaries
    .map((entry) => entry.sourceSummary)
    .sort((left, right) => {
      if (right.sortTimestamp !== left.sortTimestamp) return right.sortTimestamp - left.sortTimestamp;
      return String(right.orderMongoId).localeCompare(String(left.orderMongoId));
    });
  const sortedMirrored = coveredSummaries
    .map((entry) => entry.mirroredSummary)
    .sort((left, right) => {
      if (right.sortTimestamp !== left.sortTimestamp) return right.sortTimestamp - left.sortTimestamp;
      return String(right.orderMongoId).localeCompare(String(left.orderMongoId));
    });

  const expectedOrder = sortedSource.map((entry) => entry.orderMongoId);
  const actualOrder = sortedMirrored.map((entry) => entry.orderMongoId);
  if (expectedOrder.join("|") !== actualOrder.join("|")) {
    discrepancies.push(`ordering:${expectedOrder.join("|")}->${actualOrder.join("|")}`);
  }

  sortedSource.forEach((sourceSummary, index) => {
    const orderMongoId = sourceSummary.orderMongoId;
    const mirroredSummary = mirroredById.get(orderMongoId);
    if (!mirroredSummary) return;

    compareCanonicalField({
      label: `order[${index}].orderExternalId`,
      expectedValue: sourceSummary.orderExternalId,
      actualValue: mirroredSummary.orderExternalId,
      validator: isValidOrderExternalId,
      discrepancies,
    });

    compareShadowField({
      label: `order[${index}].buyerMongoId`,
      expectedValue: sourceSummary.buyerMongoId,
      actualValue: mirroredSummary.buyerMongoId,
      discrepancies,
    });
    compareShadowField({
      label: `order[${index}].status`,
      expectedValue: sourceSummary.status,
      actualValue: mirroredSummary.status,
      discrepancies,
    });
    compareShadowField({
      label: `order[${index}].currency`,
      expectedValue: sourceSummary.currency,
      actualValue: mirroredSummary.currency,
      discrepancies,
    });

    compareShadowNumericField({
      label: `order[${index}].total`,
      expectedValue: sourceSummary.total,
      actualValue: mirroredSummary.total,
      discrepancies,
    });
    compareShadowNumericField({
      label: `order[${index}].totalAfterDiscount`,
      expectedValue: sourceSummary.totalAfterDiscount,
      actualValue: mirroredSummary.totalAfterDiscount,
      discrepancies,
    });
    compareShadowNumericField({
      label: `order[${index}].discount`,
      expectedValue: sourceSummary.discount,
      actualValue: mirroredSummary.discount,
      discrepancies,
    });
    compareShadowNumericField({
      label: `order[${index}].vendorCount`,
      expectedValue: sourceSummary.vendorCount,
      actualValue: mirroredSummary.vendorCount,
      discrepancies,
    });
    compareShadowNumericField({
      label: `order[${index}].itemCount`,
      expectedValue: sourceSummary.itemCount,
      actualValue: mirroredSummary.itemCount,
      discrepancies,
    });
  });

  return discrepancies;
}

async function buildMirrorPayload(order, vendors) {
  const orderExternalId = await resolveOrderExternalId(order);
  const buyerExternalId = await resolveBuyerExternalId(order);
  const enrichedVendors = await enrichVendorsWithCanonicalIdentity(vendors);
  const sourceSummary = buildMirrorSummary(order, enrichedVendors);

  return {
    sourceSummary,
    data: {
      orderExternalId,
      buyerMongoId: order.buyer ? String(order.buyer) : "",
      buyerExternalId,
      status: order.status || "pending",
      currency: order.currency || "USD",
      paymentMethod: order.paymentMethod || "cod",
      total: sourceSummary.total,
      totalAfterDiscount: sourceSummary.totalAfterDiscount,
      discount: sourceSummary.discount,
      vendorCount: sourceSummary.vendorCount,
      itemCount: sourceSummary.itemCount,
      invoiceCount: sourceSummary.invoiceCount,
      promoMongoId: order.promoCode ? String(order.promoCode) : null,
      shippingAddressJson: asJsonOrNull(order.shippingAddress),
      deliveryOptionJson: asJsonOrNull(order.deliveryOption),
      orderDate: toDate(order.orderDate),
      sourceCreatedAt: toDate(order.createdAt),
      sourceUpdatedAt: toDate(order.updatedAt),
      vendors: {
        create: buildVendorRows(enrichedVendors),
      },
    },
  };
}

async function mirrorOrderCreationToPostgres({ order, vendors }) {
  const mode = resolveOrdersPgMirrorMode();
  if (mode === "off") {
    return { status: "skipped", reason: "mirror-mode-off" };
  }

  if (!order || !order._id) {
    return { status: "skipped", reason: "missing-order-id" };
  }

  const orderMongoId = String(order._id);
  const prisma = getPrismaClient();
  const { data, sourceSummary } = await buildMirrorPayload(order, vendors);

  try {
    const existing = await prisma.orderMirror.findUnique({
      where: { mongoId: orderMongoId },
      include: {
        vendors: {
          include: {
            items: true,
          },
        },
      },
    });

    const mirrored = await prisma.orderMirror.upsert({
      where: { mongoId: orderMongoId },
      create: {
        mongoId: orderMongoId,
        ...data,
      },
      update: {
        ...data,
        vendors: {
          deleteMany: {},
          create: data.vendors.create,
        },
      },
      include: {
        vendors: {
          include: {
            items: true,
          },
        },
      },
    });

    const mirroredSummary = summarizeMirroredOrder(mirrored);
    const discrepancies = compareMirrorSummary(sourceSummary, mirroredSummary);
    const identityDiscrepancies = compareCanonicalIdentityCompleteness(data, mirrored);
    const shadowReadParityDiscrepancies = compareOrderDetailShadowParity(data, mirrored, orderMongoId);

    if (String(process.env.ORDERS_PG_MIRROR_LOG_SUCCESS || "").toLowerCase() === "true") {
      console.log(
        `[orders-postgres-mirror] ${existing ? "Updated" : "Mirrored"} order ${orderMongoId} to Postgres.`
      );
    }

    return {
      status: existing ? "updated" : "ok",
      orderMongoId,
      summary: sourceSummary,
      discrepancies,
      identityDiscrepancies,
      shadowReadParityDiscrepancies,
    };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.warn(`[orders-postgres-mirror] Failed to mirror order ${orderMongoId}: ${message}`);
    return { status: "failed", orderMongoId, error: message };
  }
}

module.exports = {
  buildMirrorPayload,
  buildMirrorSummary,
  buildMirroredAdminOrderListSummary,
  buildMirroredCustomerOrderListSummary,
  buildMirroredVendorOrderListSummary,
  buildSourceAdminOrderListSummary,
  buildSourceCustomerOrderListSummary,
  buildSourceVendorOrderListSummary,
  buildVendorRows,
  compareAdminOrderListSummaryShadowParity,
  compareCanonicalIdentityCompleteness,
  compareCustomerOrderListSummaryShadowParity,
  compareOrderDetailShadowParity,
  compareMirrorSummary,
  compareVendorOrderListSummaryShadowParity,
  enrichVendorsWithCanonicalIdentity,
  mirrorOrderCreationToPostgres,
  resolveBuyerExternalId,
  resolveOrderExternalId,
  resolveOrdersPgMirrorMode,
  summarizeMirroredOrder,
};
