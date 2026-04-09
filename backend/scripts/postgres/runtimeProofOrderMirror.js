#!/usr/bin/env node

const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../../server");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const User = require("../../models/User");
const Invoice = require("../../models/Invoice");
const { getPrismaClient, disconnectPrismaClient } = require("../../prisma/client");
const {
  buildMirrorPayload,
  compareCanonicalIdentityCompleteness,
  compareCustomerOrderListSummaryShadowParity,
  compareOrderDetailShadowParity,
  summarizeMirroredOrder,
} = require("../../services/orderPostgresMirror");
const {
  isValidExternalId,
  isValidInvoiceExternalId,
  isValidOrderExternalId,
  isValidProductExternalId,
  isValidVendorExternalId,
} = require("../../utils/externalId");

function rid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function run() {
  const prisma = getPrismaClient();

  const runId = rid("pg-proof");
  const vendorEmail = `${runId}-vendor@example.com`;
  const buyerEmail = `${runId}-buyer@example.com`;

  let vendor;
  let product;
  let createdOrderId = null;

  await app.locals.mongoConnectionReady;

  vendor = await User.create({
    name: `Vendor ${runId}`,
    email: vendorEmail,
    password: "RuntimeProof123!",
    roles: ["vendor"],
    country: "ET",
  });

  product = await Product.create({
    name: `Mirror Product ${runId}`,
    description: "Runtime proof product",
    price: 100,
    stock: 10,
    vendor: vendor._id,
    category: "runtime-proof",
    image: "",
    images: [],
    language: "en",
  });

  const payload = {
    buyerInfo: {
      name: `Buyer ${runId}`,
      email: buyerEmail,
      country: "ET",
    },
    cartItems: [
      {
        productId: String(product._id),
        quantity: 2,
      },
    ],
    shippingAddress: {
      fullName: `Buyer ${runId}`,
      city: "Addis Ababa",
      country: "ET",
      street: "Bole",
      phone: "+251900000000",
      postalCode: "1000",
    },
    paymentMethod: "cod",
    deliveryOption: {
      name: "Standard",
      cost: 10,
      days: "3-5 days",
    },
    discount: 0,
    totalAfterDiscount: 240,
  };

  const res = await request(app).post("/api/orders").send(payload);

  assert.equal(res.status, 201, `Expected 201 but received ${res.status}`);
  assert.equal(res.body.success, true, "Expected success=true");
  assert.equal(res.body.message, "Order placed successfully", "Unexpected order success message");
  assert.ok(res.body.order, "Response missing order object");
  assert.ok(Array.isArray(res.body.invoices), "Response missing invoices array");

  createdOrderId = String(res.body.order._id || "");
  assert.ok(createdOrderId, "Response order missing _id");

  const mongoOrder = await Order.findById(createdOrderId).select("+externalId").lean();
  assert.ok(mongoOrder, "Mongo order was not persisted");

  const mirrored = await prisma.orderMirror.findUnique({
    where: { mongoId: createdOrderId },
    include: {
      vendors: {
        include: {
          items: true,
        },
      },
    },
  });

  assert.ok(mirrored, "Postgres mirror row was not written");
  assert.equal(String(mirrored.mongoId), createdOrderId, "Mirror mongoId mismatch");
  assert.equal(mirrored.vendors.length, mongoOrder.vendors.length, "Vendor mirror count mismatch");
  const { data: expectedMirrorData } = await buildMirrorPayload(mongoOrder, mongoOrder.vendors || []);
  const identityDiscrepancies = compareCanonicalIdentityCompleteness(expectedMirrorData, mirrored);
  const shadowReadParityDiscrepancies = compareOrderDetailShadowParity(
    expectedMirrorData,
    mirrored,
    createdOrderId
  );
  const sourceOrderList = await Order.find({ buyer: mongoOrder.buyer })
    .select("_id buyer status currency total totalAfterDiscount discount vendors createdAt +externalId")
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  const mirroredOrderList = await prisma.orderMirror.findMany({
    where: { buyerMongoId: String(mongoOrder.buyer) },
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
    String(mongoOrder.buyer)
  );
  assert.equal(
    identityDiscrepancies.length,
    0,
    `Canonical identity completeness mismatches: ${identityDiscrepancies.join(", ")}`
  );
  assert.equal(
    shadowReadParityDiscrepancies.length,
    0,
    `Order detail shadow parity mismatches: ${shadowReadParityDiscrepancies.join(", ")}`
  );
  assert.equal(
    shadowListParityDiscrepancies.length,
    0,
    `Customer order-list summary shadow parity mismatches: ${shadowListParityDiscrepancies.join(", ")}`
  );

  const mirroredItemCount = mirrored.vendors.reduce((sum, v) => sum + v.items.length, 0);
  const mongoItemCount = (mongoOrder.vendors || []).reduce(
    (sum, v) => sum + ((v.products || []).length),
    0
  );
  assert.equal(mirroredItemCount, mongoItemCount, "Mirrored item count mismatch");
  assert.equal(mirrored.invoiceCount, res.body.invoices.length, "Mirrored invoice count mismatch");
  assert.ok(mirrored.vendors.every((vendor) => vendor.vendorName), "Vendor names should be mirrored");
  assert.ok(mirrored.vendors.every((vendor) => vendor.vendorEmail), "Vendor emails should be mirrored");
  assert.ok(mirrored.vendors.every((vendor) => vendor.invoiceMongoId), "Invoice links should be mirrored");
  assert.ok(
    !mongoOrder.externalId ||
      (mirrored.orderExternalId && isValidOrderExternalId(mirrored.orderExternalId)),
    "Order canonical external ID should be mirrored when source order has one"
  );
  assert.ok(
    !mirrored.buyerMongoId || (mirrored.buyerExternalId && isValidExternalId(mirrored.buyerExternalId)),
    "Buyer canonical external ID should be mirrored when buyer linkage exists"
  );
  assert.ok(
    mirrored.vendors.every(
      (vendor) => !vendor.invoiceMongoId || (vendor.invoiceExternalId && isValidInvoiceExternalId(vendor.invoiceExternalId))
    ),
    "Invoice canonical external IDs should be mirrored when invoice linkage exists"
  );
  assert.ok(
    mirrored.vendors.every((vendor) => vendor.vendorExternalId && isValidVendorExternalId(vendor.vendorExternalId)),
    "Vendor canonical external IDs should be mirrored when available"
  );
  assert.ok(
    mirrored.vendors.every((vendor) =>
      vendor.items.every((item) => item.name && item.price !== null && item.subtotal !== null && item.tax !== null)
    ),
    "Item pricing fields should be mirrored"
  );
  assert.ok(
    mirrored.vendors.every((vendor) =>
      vendor.items.every(
        (item) => item.productExternalId && isValidProductExternalId(item.productExternalId)
      )
    ),
    "Product canonical external IDs should be mirrored when available"
  );

  const responseInvariant = {
    success: res.body.success,
    message: res.body.message,
    hasOrder: Boolean(res.body.order && res.body.order._id),
    invoiceCount: res.body.invoices.length,
  };

  console.log(
    JSON.stringify(
      {
        runtimeProof: "ok",
        orderId: createdOrderId,
        responseInvariant,
        identityDiscrepancyCount: identityDiscrepancies.length,
        shadowReadParityDiscrepancyCount: shadowReadParityDiscrepancies.length,
        shadowListParityDiscrepancyCount: shadowListParityDiscrepancies.length,
        mongoOrderStatus: mongoOrder.status,
        mirroredSummary: summarizeMirroredOrder(mirrored),
      },
      null,
      2
    )
  );

  await prisma.orderMirror.deleteMany({ where: { mongoId: createdOrderId } });
  await Invoice.deleteMany({ order: createdOrderId });
  await Order.deleteMany({ _id: createdOrderId });
  await Product.deleteMany({ _id: product._id });
  await User.deleteMany({ _id: { $in: [vendor._id] } });
  await User.deleteMany({ email: buyerEmail });
}

run()
  .catch((err) => {
    console.error(
      "[application-failure][runtime-proof]",
      err && err.message ? err.message : err
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await disconnectPrismaClient();
  });
