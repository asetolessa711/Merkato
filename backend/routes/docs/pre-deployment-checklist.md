# ✅ Merkato Marketplace – Pre-Deployment Checklist

A living, actionable list to verify before any production rollout.

---

## 🔧 Configuration & Secrets

- [x] `.env` files populated for all environments (dev/stage/prod)
  - Backend: `MONGO_URI`, `JWT_SECRET`, `NODE_ENV`, `PORT`, `EMAIL_USER`, `EMAIL_PASS`
  - Frontend: `REACT_APP_API_URL` (matches deployed backend URL)
- [x] Secrets stored in CI/CD (GitHub Actions/host) — no secrets in repo
- [ ] CORS allowed origins include production domains only
- [ ] `CLIENT_URL`/callback URLs aligned across backend and frontend
- [ ] Feature flags/defaults reviewed (`docs/FEATURE_FLAGS.md`)

## � Backend Readiness

- [x] API health check `/api` returns 200
- [x] Unit/integration tests green (Jest) — validated locally
- [x] Optional routes mount safely (payments/referrals/bundles guarded)
- [ ] Rate limiting enabled on auth and sensitive endpoints
- [ ] Helmet/CORS configured with production policies
- [ ] PM2/systemd process config with graceful shutdown, auto-restart

## 🖥️ Frontend Readiness

- [x] Production build succeeds locally (`npm run build`)
- [x] Frontend unit tests pass locally (Jest/RTL)
- [ ] Error boundary shows friendly fallback and logs details
- [ ] Build artifacts cache policy set (immutable + versioned)

## 🧪 QA & E2E

- [x] Local Cypress E2E suite passes (47/47 specs/tests in this branch)
- [ ] CI E2E workflow green on main (attach artifacts/screenshots on failures)
- [x] Deterministic seed + ephemeral DB per run (guardrails in E2E scripts)
- [x] Stable `data-testid` selectors used in critical flows (admin/vendor/customer)
- [ ] Tag and schedule: core suite on PRs; full suite nightly/cron

## 📨 Email Delivery

- [x] Mailer wired and template renders (sendEmail util tested locally)
- [ ] Domain authentication (SPF, DKIM, DMARC) configured
- [ ] Test to a real recipient (order confirmation, password reset)
- [ ] Bounce/complaint handling plan documented

## 🔐 Security & Compliance

- [x] Passwords hashed (bcrypt) — verified in `models/User.js`
- [x] Strong `JWT_SECRET` length and rotation plan documented
- [ ] Dependency audit clean (`npm audit` triaged or exceptions documented)
- [ ] TLS certificates valid; HSTS enabled on edge/proxy
- [ ] Logs scrub PII; access controls for admin routes verified

## 🗃️ Data, Migrations & Backups

- [ ] Backup/restore runbook tested against staging-sized data
- [ ] Migration scripts (if any) idempotent and reversible
- [x] Test seeds are dev/test only; production seed guarded/disabled by default
- [ ] Data retention and purge policies documented

## 📈 Observability & Ops

- [x] Health checks for backend and static frontend
- [ ] Structured logging and log retention configured (e.g., Winston/ELK)
- [ ] Metrics/alerts for uptime, errors, and DB (CPU/mem/disk) in place
- [ ] Runbooks for common incidents (DB down, email provider issues)

## ⚙️ CI/CD & Release Management

- [ ] CI: backend/frontend unit tests required on PRs
- [ ] CI: E2E core on PRs, full on schedule; retries and timeouts tuned
- [ ] Build artifacts versioned; deployment is repeatable and tagged
- [ ] Release notes drafted; migration steps (if any) included

## � Rollback & DR

- [ ] Rollback plan documented (previous image/version available)
- [ ] Database rollback/point-in-time recovery plan tested
- [ ] On-call contact/escalation list updated

## ✅ Post-Deploy Checks

- [ ] Smoke test on production (login, add to cart, checkout happy-path)
- [ ] Admin bulk actions, vendor workflows, and customer checkout verified
- [ ] Error rate within acceptable thresholds after go-live

---

Last updated: 2025-09-07
