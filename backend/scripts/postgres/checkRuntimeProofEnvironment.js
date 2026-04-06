#!/usr/bin/env node

const mongoose = require("mongoose");

const { getPrismaClient, disconnectPrismaClient } = require("../../prisma/client");

function fail(message, err) {
  const detail = err && err.message ? ` ${err.message}` : "";
  console.error(`[environment-failure] ${message}${detail}`);
  process.exitCode = 1;
}

async function assertMongo() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set");
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  await mongoose.connection.db.admin().command({ ping: 1 });
  console.log("[environment-check] MongoDB runtime proof dependency reachable");
}

async function assertPostgres() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = getPrismaClient();
  await prisma.$queryRawUnsafe("SELECT 1");
  console.log("[environment-check] PostgreSQL runtime proof dependency reachable");
  await disconnectPrismaClient();
}

async function main() {
  try {
    await assertMongo();
    await assertPostgres();
  } catch (err) {
    fail("Runtime proof environment is not ready.", err);
    return;
  } finally {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await disconnectPrismaClient();
  }

  console.log("[environment-check] CI runtime proof environment is ready");
}

main().catch((err) => {
  fail("Unexpected runtime proof environment check error.", err);
});
