const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

async function startInMemoryMongo() {
  if (mongod) return process.env.MONGO_URI; // already started
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  // Point server.js to in-memory DB; let server.js initiate the connection once
  process.env.MONGO_URI = uri;
  return uri;
}

async function stopInMemoryMongo() {
  try {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.connection.close().catch(() => {});
    }
  } finally {
    if (mongod) await mongod.stop();
    mongod = null;
  }
}

module.exports = { startInMemoryMongo, stopInMemoryMongo };
