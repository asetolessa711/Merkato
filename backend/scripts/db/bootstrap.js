#!/usr/bin/env node

const mongoose = require('mongoose');
const {
  parseArgs,
  getTargetFromArgs,
  loadEnvForTarget,
  resolveMongoUri,
  connectMongo,
  loadCanonicalModels,
  createIndexesFromSchemas,
  validateRequiredIndexes,
  ensureBootstrapConfigDocs,
  seedCanonicalData,
  validateCanonicalState,
} = require('./repoDb');

function flagEnabled(args, key, defaultValue) {
  if (args[key] === true) return true;
  if (args[`no-${key}`] === true) return false;
  return defaultValue;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = getTargetFromArgs(args);

  const dropDb = flagEnabled(args, 'drop', true);
  const applyIndexes = flagEnabled(args, 'indexes', true);
  const seedData = flagEnabled(args, 'seed', true);

  const envFiles = loadEnvForTarget(target);
  const { dbName, uri } = resolveMongoUri(target);
  process.env.MONGO_URI = uri;

  console.log(`[db:bootstrap] target=${target}`);
  console.log(`[db:bootstrap] dbName=${dbName}`);
  console.log(`[db:bootstrap] uri=${uri}`);
  if (envFiles.length) {
    console.log(`[db:bootstrap] env loaded: ${envFiles.join(', ')}`);
  }

  await connectMongo(uri);
  console.log('[db:bootstrap] MongoDB connected');

  if (dropDb) {
    await mongoose.connection.db.dropDatabase();
    console.log('[db:bootstrap] Dropped existing database');
  }

  const { files, modelNames } = loadCanonicalModels();
  console.log(`[db:bootstrap] Loaded model files: ${files.length}`);
  console.log(`[db:bootstrap] Loaded model names: ${modelNames.join(', ')}`);

  if (applyIndexes) {
    const indexSummary = await createIndexesFromSchemas(modelNames);
    const totalExpected = indexSummary.reduce((sum, item) => sum + item.expectedIndexCount, 0);
    console.log(`[db:bootstrap] Applied indexes from schema definitions (expected index entries: ${totalExpected})`);
  }

  const configSummary = await ensureBootstrapConfigDocs();
  console.log(`[db:bootstrap] Config bootstrap: ${JSON.stringify(configSummary)}`);

  if (seedData) {
    const seedSummary = await seedCanonicalData();
    console.log(`[db:bootstrap] Seed summary: ${JSON.stringify(seedSummary)}`);
  }

  const missingIndexes = await validateRequiredIndexes(modelNames);
  if (missingIndexes.length > 0) {
    throw new Error(
      `Index validation failed. Missing indexes: ${missingIndexes
        .map((m) => `${m.modelName}:${m.key}`)
        .join('; ')}`
    );
  }

  if (seedData) {
    const stateProblems = await validateCanonicalState();
    if (stateProblems.length > 0) {
      throw new Error(`Canonical state validation failed: ${stateProblems.join(' | ')}`);
    }
  }

  console.log('[db:bootstrap] Completed successfully. Repository code is now the canonical source for DB state.');
  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('[db:bootstrap] FAILED:', err && err.message ? err.message : err);
  try {
    await mongoose.connection.close();
  } catch (_) {}
  process.exit(1);
});
