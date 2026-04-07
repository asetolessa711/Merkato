const { getPrismaClient } = require("../prisma/client");

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

function buildVendorRows(vendors) {
  if (!Array.isArray(vendors)) return [];

  return vendors.map((vendor) => {
    const products = Array.isArray(vendor.products) ? vendor.products : [];

    return {
      vendorMongoId: vendor.vendorId ? String(vendor.vendorId) : "",
      vendorName: vendor.vendorName || null,
      vendorEmail: vendor.vendorEmail || null,
      invoiceMongoId: vendor.invoiceId ? String(vendor.invoiceId) : null,
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

function buildMirrorPayload(order, vendors) {
  const sourceSummary = buildMirrorSummary(order, vendors);

  return {
    sourceSummary,
    data: {
      buyerMongoId: order.buyer ? String(order.buyer) : "",
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
        create: buildVendorRows(vendors),
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
  const { data, sourceSummary } = buildMirrorPayload(order, vendors);

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
          create: buildVendorRows(vendors),
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
  mirrorOrderCreationToPostgres,
  resolveOrdersPgMirrorMode,
  summarizeMirroredOrder,
};
