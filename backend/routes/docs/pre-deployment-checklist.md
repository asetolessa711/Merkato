# ✅ Merkato Marketplace – Pre-Deployment Checklist

A living document for tracking all tasks and verifications required before production deployment.

---

## 🔧 Configuration

* [x] `.env` file contains correct variables (e.g. `MONGO_URI`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`)
* [x] Environment secrets set in GitHub Actions (`EMAIL_USER`, `EMAIL_PASS`, etc.)
* [ ] Confirm `CLIENT_URL` and `BASE_URL` are aligned across backend and frontend

## 🧪 Test Coverage

* [x] Frontend builds locally without error (`npm run build`)
* [x] Backend runs without crashing (`npm run dev`)
* [x] Cypress E2E tests pass via GitHub Actions
* [x] API health check endpoint `/api` responds with status `200`
* [x] Email test endpoint `/api/test-email` sends successfully

## 📨 Email Delivery

* [x] Google App Password created and stored securely
* [x] `EMAIL_USER` and `EMAIL_PASS` tested via `sendEmail()`
* [x] Styled email template renders properly
* [ ] Add real recipient testing (e.g. confirmation, password reset)

## 🔐 Security

* [x] JWT secret stored in `.env` and GitHub Actions
* [ ] Passwords hashed with bcrypt or equivalent
* [ ] Rate limiting configured on `/forgot-password` endpoint
* [ ] TLS enabled in production hosting

## ⚙️ GitHub Actions

* [x] `.github/workflows/e2e-cypress.yml` has:

  * Backend server with `/api` health check
  * Static React app served via `npx serve -s build -l 3000`
  * `wait-on` for backend and frontend with timeout
  * Cypress artifacts uploaded if tests fail

## 🗂️ Code Hygiene

* [ ] Unused routes or models removed
* [x] `sendEmail()` exported and working
* [ ] Use consistent naming: `testEmailRoute.js`, `test-email`
* [ ] `console.log()` removed or converted to logger (except in error handling)

## 🛠️ Optional (Post-MVP)

* [ ] Add preview email route for testing HTML rendering
* [ ] Email templates with branding/logo
* [ ] Logging service (e.g. Winston, LogRocket, Sentry)
* [ ] Dockerize backend + frontend

---

**Last updated:** <!--DATE-AUTO-INSERT-->
