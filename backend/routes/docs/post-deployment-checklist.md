# ✅ Post-Deployment Checklist – Merkato Marketplace

A reference checklist to ensure platform stability, performance, and maintainability **after deployment**.

---

## 🔍 Monitoring & Logs

* [ ] Enable application logging (backend/frontend)
* [ ] Enable error tracking (e.g. Sentry, LogRocket)
* [ ] Monitor server resource usage (CPU, memory, disk)
* [ ] Set up alerts for downtime or HTTP 5xx errors

## 📈 Analytics & Metrics

* [ ] Google Analytics or other user tracking enabled
* [ ] Backend metrics collection (optional: Prometheus/Grafana)
* [ ] Sales and traffic dashboard validated

## 💬 Support & Feedback

* [ ] Live support channel available (e.g. Intercom, Zendesk)
* [ ] Contact form or support inbox functional
* [ ] Feedback collection enabled (reviews, ratings)

## 🔐 Security

* [ ] SSL/TLS certificate active and auto-renewing
* [ ] Rate limiting and brute-force protection enabled
* [ ] Admin accounts secured with strong passwords / 2FA
* [ ] Environment variables not exposed in frontend build

## 🛍️ Marketplace Health

* [ ] Vendor onboarding process tested
* [ ] Product uploads and updates functioning
* [ ] Checkout, invoice, and payment flow tested live
* [ ] Email notifications (order, support, reset) confirmed

## 🔄 Backups & Maintenance

* [ ] Database backup scheduled and tested
* [ ] Media (uploads/invoices) backup process in place
* [ ] Admin access & restore protocol defined

## 🌍 Internationalization

* [ ] Language toggle works for all supported languages
* [ ] Translations reviewed and tested
* [ ] Currency formatting correct by region

## 🧪 Post-Deployment Testing

* [ ] Smoke tests on production passed
* [ ] Manual flow: register → browse → cart → checkout → order
* [ ] Admin dashboard tested
* [ ] E2E Cypress CI job triggered on `main` branch

## 📤 Communication

* [ ] Stakeholders informed of live status
* [ ] Internal test users invited for UAT
* [ ] Social media or launch announcement scheduled

---

> 📌 Keep this checklist updated in `/docs/post-deployment-checklist.md` and review after every production deployment.

---
