#!/usr/bin/env node

const mongoose = require('mongoose');
const {
  parseArgs,
  getTargetFromArgs,
  loadEnvForTarget,
  resolveMongoUri,
  connectMongo,
  loadCanonicalModels,
  validateRequiredIndexes,
  validateCanonicalState,
} = require('./repoDb');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = getTargetFromArgs(args);
  const requireSeedState = args['require-seed'] === true;

  loadEnvForTarget(target);
  const { dbName, uri } = resolveMongoUri(target);
  process.env.MONGO_URI = uri;

  console.log(`[db:validate] target=${target}`);
  console.log(`[db:validate] dbName=${dbName}`);
  console.log(`[db:validate] uri=${uri}`);

  await connectMongo(uri);
  const { modelNames } = loadCanonicalModels();
  console.log(`[db:validate] model count=${modelNames.length}`);

  const missingIndexes = await validateRequiredIndexes(modelNames);
  if (missingIndexes.length > 0) {
    throw new Error(
      `Missing schema indexes: ${missingIndexes
        .map((m) => `${m.modelName}:${m.key}`)
        .join('; ')}`
    );
  }

  if (requireSeedState) {
    const stateProblems = await validateCanonicalState();
    if (stateProblems.length > 0) {
      throw new Error(`Seed/config validation failed: ${stateProblems.join(' | ')}`);
    }
  }

  console.log('[db:validate] Validation successful');
  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('[db:validate] FAILED:', err && err.message ? err.message : err);
  try {
    await mongoose.connection.close();
  } catch (_) {}
  process.exit(1);
});
