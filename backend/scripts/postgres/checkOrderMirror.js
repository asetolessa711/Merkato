#!/usr/bin/env node

const { getPrismaClient, disconnectPrismaClient } = require("../../prisma/client");

async function main() {
  const orderId = process.argv[2] || process.env.MONGO_ORDER_ID;
  if (!orderId) {
    console.error("Usage: node scripts/postgres/checkOrderMirror.js <mongoOrderId>");
    process.exitCode = 1;
    return;
  }

  const prisma = getPrismaClient();

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

  const summary = {
    mongoId: mirrored.mongoId,
    buyerMongoId: mirrored.buyerMongoId,
    status: mirrored.status,
    total: mirrored.total,
    vendorCount: mirrored.vendors.length,
    itemCount: mirrored.vendors.reduce((acc, vendor) => acc + vendor.items.length, 0),
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
    await disconnectPrismaClient();
  });
