#!/usr/bin/env node

const mongoose = require("mongoose");

const { getPrismaClient, disconnectPrismaClient } = require("../../prisma/client");
const Order = require("../../models/Order");
const Invoice = require("../../models/Invoice");
const {
  buildMirrorSummary,
  compareMirrorSummary,
  summarizeMirroredOrder,
} = require("../../services/orderPostgresMirror");
const {
  isValidExternalId,
  isValidInvoiceExternalId,
  isValidOrderExternalId,
  isValidProductExternalId,
  isValidVendorExternalId,
} = require("../../utils/externalId");

async function main() {
  const orderId = process.argv[2] || process.env.MONGO_ORDER_ID;
  if (!orderId) {
    console.error("Usage: node scripts/postgres/checkOrderMirror.js <mongoOrderId>");
    process.exitCode = 1;
    return;
  }

  const prisma = getPrismaClient();
  const mongoUri = process.env.MONGO_URI || process.env.MONGO_URI_FALLBACK;
  if (!mongoUri) {
    console.error("MONGO_URI or MONGO_URI_FALLBACK is required for mirror comparison");
    process.exitCode = 3;
    return;
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const sourceOrder = await Order.findById(orderId).select("+externalId").lean();
  if (!sourceOrder) {
    console.error(`[pg-mirror-check] No Mongo order found for ${orderId}`);
    process.exitCode = 4;
    return;
  }

  const sourceOrderExternalId =
    sourceOrder && sourceOrder.externalId
      ? String(sourceOrder.externalId).trim().toLowerCase()
      : null;
  const validSourceOrderExternalId =
    sourceOrderExternalId && isValidOrderExternalId(sourceOrderExternalId) ? sourceOrderExternalId : null;

  const sourceInvoiceIds = Array.from(
    new Set(
      (Array.isArray(sourceOrder.vendors) ? sourceOrder.vendors : [])
        .map((vendor) => (vendor && vendor.invoiceId ? String(vendor.invoiceId) : ""))
        .filter(Boolean)
    )
  );
  let sourceInvoiceExternalIdByMongoId = new Map();
  if (sourceInvoiceIds.length > 0) {
    const sourceInvoices = await Invoice.find({ _id: { $in: sourceInvoiceIds } })
      .select("_id externalId")
      .lean();
    sourceInvoiceExternalIdByMongoId = sourceInvoices.reduce((acc, invoice) => {
      if (!invoice || !invoice._id || !invoice.externalId) return acc;
      const normalized = String(invoice.externalId).trim().toLowerCase();
      if (!isValidInvoiceExternalId(normalized)) return acc;
      acc.set(String(invoice._id), normalized);
      return acc;
    }, new Map());
  }

  const mirrored = await prisma.orderMirror.findUnique({
    where: { mongoId: String(orderId) },
    include: {
      vendors: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!mirrored) {
    console.error(`[pg-mirror-check] No mirrored row found for order ${orderId}`);
    process.exitCode = 2;
    return;
  }

  const sourceSummary = buildMirrorSummary(sourceOrder, sourceOrder.vendors || []);
  const mirroredSummary = summarizeMirroredOrder(mirrored);
  const discrepancies = compareMirrorSummary(sourceSummary, mirroredSummary);
  const richShape = {
    orderCanonicalIdPresentWhenSourcePresent:
      !validSourceOrderExternalId ||
      (Boolean(mirrored.orderExternalId) && isValidOrderExternalId(mirrored.orderExternalId)),
    buyerCanonicalIdPresentWhenBuyerLinked:
      !mirrored.buyerMongoId || (Boolean(mirrored.buyerExternalId) && isValidExternalId(mirrored.buyerExternalId)),
    vendorNamesPresent: mirrored.vendors.every((vendor) => Boolean(vendor.vendorName)),
    vendorEmailsPresent: mirrored.vendors.every((vendor) => Boolean(vendor.vendorEmail)),
    invoiceLinksPresent: mirrored.vendors.every((vendor) => Boolean(vendor.invoiceMongoId)),
    invoiceCanonicalIdsPresentWhenInvoiceLinked: mirrored.vendors.every(
      (vendor) =>
        !vendor.invoiceMongoId ||
        (Boolean(vendor.invoiceExternalId) && isValidInvoiceExternalId(vendor.invoiceExternalId))
    ),
    invoiceCanonicalIdsPropagatedWhenSourcePresent: mirrored.vendors.every((vendor) => {
      if (!vendor.invoiceMongoId) return true;
      const sourceInvoiceExternalId = sourceInvoiceExternalIdByMongoId.get(String(vendor.invoiceMongoId));
      if (!sourceInvoiceExternalId) return true;
      return (
        Boolean(vendor.invoiceExternalId) &&
        String(vendor.invoiceExternalId).trim().toLowerCase() === sourceInvoiceExternalId
      );
    }),
    vendorCanonicalIdsPresent: mirrored.vendors.every(
      (vendor) => Boolean(vendor.vendorExternalId) && isValidVendorExternalId(vendor.vendorExternalId)
    ),
    itemPricingPresent: mirrored.vendors.every((vendor) =>
      vendor.items.every((item) => item.name && item.price !== null && item.subtotal !== null && item.tax !== null)
    ),
    productCanonicalIdsPresent: mirrored.vendors.every((vendor) =>
      vendor.items.every(
        (item) => Boolean(item.productExternalId) && isValidProductExternalId(item.productExternalId)
      )
    ),
  };

  const summary = {
    mongoId: mirrored.mongoId,
    sourceSummary,
    mirroredSummary,
    discrepancies,
    richShape,
    mirroredAt: mirrored.mirroredAt,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error("[pg-mirror-check] Unexpected error:", err && err.message ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await disconnectPrismaClient();
  });
