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

  try {
    const existing = await prisma.orderMirror.findUnique({
      where: { mongoId: orderMongoId },
      select: { id: true },
    });

    if (existing) {
      return { status: "skipped", reason: "already-mirrored", orderMongoId };
    }

    await prisma.orderMirror.create({
      data: {
        mongoId: orderMongoId,
        buyerMongoId: order.buyer ? String(order.buyer) : "",
        status: order.status || "pending",
        currency: order.currency || "USD",
        paymentMethod: order.paymentMethod || "cod",
        total: toMoney(order.total),
        totalAfterDiscount: toMoney(order.totalAfterDiscount),
        discount: toMoney(order.discount),
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
    });

    if (String(process.env.ORDERS_PG_MIRROR_LOG_SUCCESS || "").toLowerCase() === "true") {
      console.log(`[orders-postgres-mirror] Mirrored order ${orderMongoId} to Postgres.`);
    }

    return { status: "ok", orderMongoId };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.warn(`[orders-postgres-mirror] Failed to mirror order ${orderMongoId}: ${message}`);
    return { status: "failed", orderMongoId, error: message };
  }
}

module.exports = {
  mirrorOrderCreationToPostgres,
  resolveOrdersPgMirrorMode,
};
