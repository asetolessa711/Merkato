#!/usr/bin/env node
/*
  Guard Merkato workspace against cross-project or cloud data contamination.
  - Disallow WALIIN_* envs and values containing "waliin" for critical keys
  - In tests/CI/E2E, require local DB URIs (no mongodb+srv, no remote hosts)
  - Encourage MERKATO_* usage for project-scoped variables
  - Warn on potentially real email provider configs in non-prod unless MERKATO_TEST_EMAIL_TO set
*/

const os = require('os');

const CRITICAL_KEYS_REGEX = /^(.*(MONGO|DB|URL|URI|HOST|ENDPOINT|BUCKET|PROJECT|API).*)$/i;
const FORBIDDEN_PREFIXES = ['WALIIN_'];

function isLocalAddress(url) {
  if (!url || typeof url !== 'string') return true;
  const u = url.toLowerCase();
  // Consider local if it contains localhost, 127.0.0.1, or is a file path
  return (
    u.includes('localhost') ||
    u.includes('127.0.0.1') ||
    u.startsWith('file:') ||
    /^[a-z]:\\|^\//i.test(url) // windows/unix path
  );
}

function looksLikeCloudMongo(url) {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.startsWith('mongodb+srv://') || /mongo.*atlas|\.mongodb\.net/.test(u);
}

function guard(opts = {}) {
  const phase = opts.phase || 'runtime';
  const env = process.env;
  const errors = [];
  const warnings = [];

  // 1) Disallow forbidden prefixes entirely
  for (const k of Object.keys(env)) {
    if (FORBIDDEN_PREFIXES.some(p => k.startsWith(p))) {
      errors.push(`Forbidden env var present: ${k}`);
    }
  }

  // 2) Disallow values mentioning other project names in critical keys
  for (const k of Object.keys(env)) {
    if (!CRITICAL_KEYS_REGEX.test(k)) continue;
    const v = env[k];
    if (!v || typeof v !== 'string') continue;
    if (/waliin/i.test(v)) {
      errors.push(`Env ${k} references another project (contains 'waliin'): ${v}`);
    }
  }

  const isTestLike = !!(env.CI || env.JEST_WORKER_ID !== undefined || env.NODE_ENV === 'test' || phase === 'tests');

  // 3) In tests/CI/E2E, DB URIs must be local
  if (isTestLike) {
    for (const k of Object.keys(env)) {
      if (/MONGO.*(URL|URI)?/i.test(k)) {
        const v = env[k];
        if (!v) continue;
        if (looksLikeCloudMongo(v) || !isLocalAddress(v)) {
          errors.push(`Test/E2E requires local DB. ${k}='${v}' looks remote.`);
        }
      }
    }
  }

  // 4) Email safety: discourage real email providers in non-prod
  if (env.NODE_ENV !== 'production') {
    const realEmailKeys = ['SMTP_URL', 'SMTP_HOST', 'MAILGUN_*', 'SENDGRID_*'];
    for (const pattern of realEmailKeys) {
      const rx = new RegExp('^' + pattern.replace('*', '.*') + '$', 'i');
      const hit = Object.keys(env).some(k => rx.test(k));
      if (hit && !env.MERKATO_TEST_EMAIL_TO) {
        warnings.push(`Email config '${pattern}' present without MERKATO_TEST_EMAIL_TO set.`);
      }
    }
  }

  // 5) Friendly nudge about MERKATO_* usage
  const hasMerkatoVars = Object.keys(env).some(k => k.startsWith('MERKATO_'));
  if (!hasMerkatoVars) {
    warnings.push('No MERKATO_* env vars detected. Ensure project-scoped config keys are prefixed.');
  }

  if (errors.length) {
    const header = `[Boundary Guard] Violations detected (${phase} on ${os.hostname()}):`;
    const msg = header + '\n- ' + errors.join('\n- ');
    if (phase === 'tests' || isTestLike) {
      throw new Error(msg);
    } else {
      // Runtime: fail hard to avoid accidental contamination
      throw new Error(msg);
    }
  }

  if (warnings.length) {
    console.warn('[Boundary Guard] Warnings:\n- ' + warnings.join('\n- '));
  }
}

module.exports = { guard };

if (require.main === module) {
  try {
    guard({ phase: process.argv[2] || 'runtime' });
    process.exit(0);
  } catch (e) {
    console.error(String(e && e.message ? e.message : e));
    process.exit(1);
  }
}
