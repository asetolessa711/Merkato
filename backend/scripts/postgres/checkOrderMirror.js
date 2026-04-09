#!/usr/bin/env node

const mongoose = require("mongoose");

const { getPrismaClient, disconnectPrismaClient } = require("../../prisma/client");
const Order = require("../../models/Order");
const {
  buildMirrorPayload,
  buildMirrorSummary,
  compareAdminOrderListSummaryShadowParity,
  compareCanonicalIdentityCompleteness,
  compareCustomerOrderListSummaryShadowParity,
  compareOrderDetailShadowParity,
  compareMirrorSummary,
  compareVendorOrderListSummaryShadowParity,
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
  const sourceOrderList = await Order.find({ buyer: sourceOrder.buyer })
    .select("_id buyer status currency total totalAfterDiscount discount vendors createdAt +externalId")
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  const mirroredOrderList = await prisma.orderMirror.findMany({
    where: { buyerMongoId: String(sourceOrder.buyer) },
    select: {
      mongoId: true,
      orderExternalId: true,
      buyerMongoId: true,
      status: true,
      currency: true,
      total: true,
      totalAfterDiscount: true,
      discount: true,
      vendorCount: true,
      itemCount: true,
      sourceCreatedAt: true,
      mirroredAt: true,
    },
    orderBy: [{ sourceCreatedAt: "desc" }, { mongoId: "desc" }],
  });
  const shadowListParityDiscrepancies = compareCustomerOrderListSummaryShadowParity(
    sourceOrderList,
    mirroredOrderList,
    String(sourceOrder.buyer)
  );
  const sourceVendorMongoId = Array.isArray(sourceOrder.vendors) && sourceOrder.vendors[0] && sourceOrder.vendors[0].vendorId
    ? String(sourceOrder.vendors[0].vendorId)
    : null;
  const sourceVendorOrderList = sourceVendorMongoId
    ? await Order.find({ "vendors.vendorId": sourceVendorMongoId })
      .select("_id status currency vendors createdAt +externalId")
      .sort({ createdAt: -1, _id: -1 })
      .lean()
    : [];
  const mirroredVendorOrderList = sourceVendorMongoId
    ? await prisma.orderMirror.findMany({
      where: { vendors: { some: { vendorMongoId: sourceVendorMongoId } } },
      select: {
        mongoId: true,
        orderExternalId: true,
        status: true,
        currency: true,
        sourceCreatedAt: true,
        mirroredAt: true,
        vendors: {
          where: { vendorMongoId: sourceVendorMongoId },
          select: {
            vendorMongoId: true,
            vendorExternalId: true,
            status: true,
            currency: true,
            subtotal: true,
            discount: true,
            tax: true,
            shipping: true,
            total: true,
            commissionAmount: true,
            netEarnings: true,
            items: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: [{ sourceCreatedAt: "desc" }, { mongoId: "desc" }],
    })
    : [];
  const shadowVendorListParityDiscrepancies = compareVendorOrderListSummaryShadowParity(
    sourceVendorOrderList,
    mirroredVendorOrderList,
    sourceVendorMongoId
  );
  const sourceAdminOrderList = await Order.find({})
    .select("_id buyer status currency paymentMethod total totalAfterDiscount discount vendors createdAt +externalId")
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  const mirroredAdminOrderList = await prisma.orderMirror.findMany({
    select: {
      mongoId: true,
      orderExternalId: true,
      buyerMongoId: true,
      buyerExternalId: true,
      status: true,
      currency: true,
      paymentMethod: true,
      total: true,
      totalAfterDiscount: true,
      discount: true,
      vendorCount: true,
      itemCount: true,
      invoiceCount: true,
      sourceCreatedAt: true,
      mirroredAt: true,
    },
    orderBy: [{ sourceCreatedAt: "desc" }, { mongoId: "desc" }],
  });
  const shadowAdminListParityDiscrepancies = compareAdminOrderListSummaryShadowParity(
    sourceAdminOrderList,
    mirroredAdminOrderList
  );
  const richShape = {
    canonicalIdentityCompleteness: identityDiscrepancies.length === 0,
    orderDetailShadowParity: shadowReadParityDiscrepancies.length === 0,
    customerOrderListSummaryShadowParity: shadowListParityDiscrepancies.length === 0,
    vendorOrderListSummaryShadowParity: shadowVendorListParityDiscrepancies.length === 0,
    adminOrderListSummaryShadowParity: shadowAdminListParityDiscrepancies.length === 0,
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
    shadowListParityDiscrepancies,
    shadowVendorListParityDiscrepancies,
    shadowAdminListParityDiscrepancies,
    richShape,
    mirroredAt: mirrored.mirroredAt,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (
    identityDiscrepancies.length > 0 ||
    shadowReadParityDiscrepancies.length > 0 ||
    shadowListParityDiscrepancies.length > 0 ||
    shadowVendorListParityDiscrepancies.length > 0 ||
    shadowAdminListParityDiscrepancies.length > 0
  ) {
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
