/*
 One-time migration:
 - Normalize legacy placementKey -> new taxonomy via normalizePlacementKey
 - Optionally set tactic from simple heuristics (if missing)
 Usage: node scripts/migratePlacements.js
 Requires MONGO_URI or uses the same connection as your app if run within app context.
*/
const mongoose = require('mongoose');
const Rail = require('../models/Rail');
const { normalizePlacementKey } = require('../utils/placementTaxonomy');

async function main(){
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/merkato';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: process.env.DB_NAME || undefined });
  }
  const cursor = Rail.find({}).cursor();
  let updated=0, scanned=0;
  for await (const doc of cursor){
    scanned++;
    const prev = doc.placementKey;
    const norm = normalizePlacementKey(prev);
    let changed = false;
    if (norm && norm !== prev) { doc.placementKey = norm; changed = true; }
    if (!doc.tactic) {
      // Heuristics
      if (norm === 'PDP' || norm === 'Cart') { doc.tactic = 'CrossSell'; changed = true; }
      else if (/Deals/i.test(doc.title||'')) { doc.tactic = 'DealsHub'; changed = true; }
      else if (/Brand/i.test(doc.title||'')) { doc.tactic = 'BrandSpotlight'; changed = true; }
      else { doc.tactic = 'Curated'; changed = true; }
    }
    if (changed){ await doc.save(); updated++; }
  }
  console.log(JSON.stringify({ scanned, updated }));
  await mongoose.disconnect();
}

main().catch(e=>{ console.error(e); process.exit(1); });
