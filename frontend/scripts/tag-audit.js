const fs = require('fs');
const path = require('path');

function findSpecs(dir) {
  const out = [];
  (function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.cy\.(js|jsx|ts|tsx)$/i.test(e.name)) out.push(p);
    }
  })(dir);
  return out;
}

function extractTags(content) {
  // Only treat tokens as tags if they appear inside describe()/it() titles or inline comments starting with // NOTE: Tag: @...
  // This reduces accidental matches from historical comments or unrelated strings.
  const tags = new Set();
  const titleRegex = /(describe|it)\(\s*(['"`])([\s\S]*?)\2/g;
  let m;
  while ((m = titleRegex.exec(content))) {
    const title = m[3];
    let tm;
    const tagRegex = /(^|\s)@([a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)?)(?=\s|$)/g;
    while ((tm = tagRegex.exec(title))) {
      tags.add(tm[2].toLowerCase());
    }
  }
  // Also parse explicit Tag annotation comments
  const commentRegex = /\/\/\s*Tag[s]?:\s*((?:@[a-zA-Z0-9_-]+\s*)+)/g;
  let cm;
  while ((cm = commentRegex.exec(content))) {
    const block = cm[1];
    let tm;
    const tagRegex = /@([a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)?)/g;
    while ((tm = tagRegex.exec(block))) {
      tags.add(tm[1].toLowerCase());
    }
  }
  return Array.from(tags).sort();
}

function main() {
  const root = path.resolve(__dirname, '..');
  const e2eDir = path.join(root, 'cypress', 'e2e');
  const specs = findSpecs(e2eDir);
  let curatedSmokeBase = [];
  try {
    const cfgPath = path.join(root, 'cypress', 'smoke', 'curated-smoke.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (Array.isArray(cfg.specs)) curatedSmokeBase = cfg.specs;
    }
  } catch (_) {}
  const report = { totalSpecs: specs.length, specs: [], tagCounts: {}, classifications: { personas: {}, domains: {}, smoke: { total: 0, byPersona: {} } }, curated: { base: curatedSmokeBase, missingFiles: [], missingTags: [] } };
  const personaTags = new Set(['admin','vendor','buyer','customer']);
  // Domain buckets (extendable)
  const domainMap = {
    checkout: /(checkout|payment|cart|paypal)/i,
    orders: /(order|refund|return|bulk)/i,
    product: /(product|upload)/i,
    access: /(auth|login|roles|forbidden)/i,
    a11y: /a11y/i
  };
  for (const spec of specs) {
    const content = fs.readFileSync(spec, 'utf8');
    const tags = extractTags(content);
    const rel = path.relative(root, spec);
    const base = path.basename(spec);
    // Derive personas from tags OR filename hints
    const personas = Array.from(new Set(tags.filter(t => personaTags.has(t))));
    const isSmoke = tags.includes('smoke');
    // Track curated coverage issues
    if (curatedSmokeBase.includes(base)) {
      if (!isSmoke) report.curated.missingTags.push(base);
    }
    if (isSmoke) {
      report.classifications.smoke.total += 1;
      for (const p of personas) {
        report.classifications.smoke.byPersona[p] = (report.classifications.smoke.byPersona[p] || 0) + 1;
      }
    }
    for (const p of personas) {
      report.classifications.personas[p] = report.classifications.personas[p] || { total: 0, smoke: 0 };
      report.classifications.personas[p].total += 1;
      if (isSmoke) report.classifications.personas[p].smoke += 1;
    }
    // Domain inference via filename & tags
    const domains = [];
    for (const [dom, rx] of Object.entries(domainMap)) {
      if (rx.test(rel) || tags.some(t => rx.test(t))) domains.push(dom);
    }
    for (const d of domains) {
      report.classifications.domains[d] = report.classifications.domains[d] || { total: 0, smoke: 0 };
      report.classifications.domains[d].total += 1;
      if (isSmoke) report.classifications.domains[d].smoke += 1;
    }
    report.specs.push({ file: rel, tags, personas, domains, smoke: isSmoke });
    for (const t of tags) report.tagCounts[t] = (report.tagCounts[t] || 0) + 1;
  }
  // Sort tagCounts by desc
  const sortedTags = Object.entries(report.tagCounts).sort((a,b)=>b[1]-a[1]);
  const outDir = path.join(root, 'cypress-results');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'tag-audit.json'), JSON.stringify(report, null, 2));
  // Curated file presence validation
  for (const b of curatedSmokeBase) {
    const exists = specs.some(s => path.basename(s) === b);
    if (!exists) report.curated.missingFiles.push(b);
  }

  const lines = [];
  lines.push('# Cypress Tag Audit');
  lines.push('');
  lines.push(`- Total specs: ${report.totalSpecs}`);
  lines.push('- Tags:');
  for (const [t,c] of sortedTags) lines.push(`  - ${t}: ${c}`);
  lines.push('');
  lines.push('## Curated Smoke Validation');
  lines.push(`- Curated list size: ${curatedSmokeBase.length}`);
  if (report.curated.missingFiles.length) lines.push(`- Missing curated spec files: ${report.curated.missingFiles.join(', ')}`); else lines.push('- All curated spec files present.');
  if (report.curated.missingTags.length) lines.push(`- Curated specs lacking @smoke tag: ${report.curated.missingTags.join(', ')}`); else lines.push('- All curated specs tagged with @smoke.');
  lines.push('');
  lines.push('## Persona Coverage');
  for (const [p, meta] of Object.entries(report.classifications.personas)) {
    const pct = meta.total ? ((meta.smoke/meta.total)*100).toFixed(1) : '0.0';
    lines.push(`- ${p}: total=${meta.total}, smoke=${meta.smoke} (${pct}% in smoke)`);
  }
  lines.push('');
  lines.push('## Domain Coverage');
  for (const [d, meta] of Object.entries(report.classifications.domains)) {
    const pct = meta.total ? ((meta.smoke/meta.total)*100).toFixed(1) : '0.0';
    lines.push(`- ${d}: total=${meta.total}, smoke=${meta.smoke} (${pct}% in smoke)`);
  }
  lines.push('');
  lines.push('## Smoke Summary');
  lines.push(`- Smoke specs: ${report.classifications.smoke.total}`);
  for (const [p, count] of Object.entries(report.classifications.smoke.byPersona)) {
    lines.push(`  - ${p}: ${count}`);
  }
  lines.push('');
  lines.push('## Specs');
  for (const s of report.specs) lines.push(`- ${s.file}  —  [${s.tags.join(', ')}]${s.personas.length?` personas=${s.personas.join(',')}`:''}${s.domains.length?` domains=${s.domains.join(',')}`:''}${s.smoke?' @smoke':''}`);
  fs.writeFileSync(path.join(outDir, 'tag-audit.md'), lines.join('\n'));
  fs.writeFileSync(path.join(outDir, 'curated-smoke.json'), JSON.stringify({ curatedSmokeBase }, null, 2));
  console.log('Tag audit written to cypress-results/tag-audit.{json,md}');
  if (report.curated.missingTags.length || report.curated.missingFiles.length) {
    console.warn('[tag-audit] Curated smoke validation issues:', JSON.stringify(report.curated, null, 2));
  }
}

main();
