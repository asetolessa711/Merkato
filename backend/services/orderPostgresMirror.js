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
  buildVendorRows,
  compareMirrorSummary,
  enrichVendorsWithCanonicalIdentity,
  mirrorOrderCreationToPostgres,
  resolveBuyerExternalId,
  resolveOrderExternalId,
  resolveOrdersPgMirrorMode,
  summarizeMirroredOrder,
};
