#!/usr/bin/env node

const mongoose = require("mongoose");

const { getPrismaClient, disconnectPrismaClient } = require("../../prisma/client");
const Order = require("../../models/Order");
const {
  buildMirrorPayload,
  buildMirrorSummary,
  compareCanonicalIdentityCompleteness,
  compareOrderDetailShadowParity,
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
  const { data: expectedMirrorData } = await buildMirrorPayload(sourceOrder, sourceOrder.vendors || []);
  const identityDiscrepancies = compareCanonicalIdentityCompleteness(expectedMirrorData, mirrored);
  const shadowReadParityDiscrepancies = compareOrderDetailShadowParity(
    expectedMirrorData,
    mirrored,
    String(sourceOrder._id)
  );
  const richShape = {
    canonicalIdentityCompleteness: identityDiscrepancies.length === 0,
    orderDetailShadowParity: shadowReadParityDiscrepancies.length === 0,
    orderCanonicalIdPresentWhenSourcePresent:
      !expectedMirrorData.orderExternalId ||
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
    invoiceCanonicalIdsPropagatedWhenSourcePresent:
      !identityDiscrepancies.some((entry) => entry.includes("invoiceExternalId")),
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
    identityDiscrepancies,
    shadowReadParityDiscrepancies,
    richShape,
    mirroredAt: mirrored.mirroredAt,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (identityDiscrepancies.length > 0 || shadowReadParityDiscrepancies.length > 0) {
    process.exitCode = 5;
  }
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
