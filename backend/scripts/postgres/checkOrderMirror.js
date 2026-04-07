#!/usr/bin/env node

const mongoose = require("mongoose");

const { getPrismaClient, disconnectPrismaClient } = require("../../prisma/client");
const Order = require("../../models/Order");
const {
  buildMirrorSummary,
  compareMirrorSummary,
  summarizeMirroredOrder,
} = require("../../services/orderPostgresMirror");

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

  const sourceOrder = await Order.findById(orderId).lean();
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
  const richShape = {
    vendorNamesPresent: mirrored.vendors.every((vendor) => Boolean(vendor.vendorName)),
    vendorEmailsPresent: mirrored.vendors.every((vendor) => Boolean(vendor.vendorEmail)),
    invoiceLinksPresent: mirrored.vendors.every((vendor) => Boolean(vendor.invoiceMongoId)),
    itemPricingPresent: mirrored.vendors.every((vendor) =>
      vendor.items.every((item) => item.name && item.price !== null && item.subtotal !== null && item.tax !== null)
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
