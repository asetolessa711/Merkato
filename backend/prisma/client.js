const { PrismaClient } = require("@prisma/client");

let prismaClient;

function getPrismaClient() {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}

async function disconnectPrismaClient() {
  if (!prismaClient) return;
  await prismaClient.$disconnect();
  prismaClient = null;
}

module.exports = {
  getPrismaClient,
  disconnectPrismaClient,
};
