# Merkato Marketplace

Welcome to Merkato — a modern B2B and D2C commerce platform.

![Backend Tests](https://github.com/asetolessa711/merkato/actions/workflows/backend-tests.yml/badge.svg)
![Frontend Tests](https://github.com/asetolessa711/merkato/actions/workflows/frontend-tests.yml/badge.svg)
![E2E Cypress Tests](https://github.com/asetolessa711/merkato/actions/workflows/e2e-cypress.yml/badge.svg)

---

## Features

- Product management
- Customer & vendor dashboards
- Sales analytics
- Stripe payments
- Role-based access
- Multilingual support
- Automated testing (Jest, Cypress, GitHub Actions)
- MongoDB with Mongoose models
- Email invoices via Nodemailer
- PDF receipts & CSV exports

---

## Demo

![Merkato Homepage](docs/merkato-homepage.png)

> Merkato connects suppliers and buyers worldwide, delivering an AI-enhanced, scalable marketplace with multi-language support, dynamic monetization, and localized user experiences.

---

## Folder Structure

```
merkato/
  frontend/
  backend/
  .github/
  docs/
  .env.example
  README.md
  ...
```

---

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/asetolessa711/merkato.git
cd merkato
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env`, `.env.test`, and `.env.local` as needed. Then fill in secrets:

```env
MONGO_URI=mongodb://localhost:27017/merkato
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

> Tip: Never commit real secrets or credentials. `.gitignore` already protects `.env*` files.

### 3. Run in Dev Mode

```bash
# In one terminal
cd backend
npm run dev

# In another terminal
cd frontend
npm run dev
```

---

## Testing

### Backend (Jest)
```bash
cd backend
npm run test
```

### Frontend (React Testing Library)
```bash
cd frontend
npm test
```

### E2E (Cypress)
```bash
cd frontend
npx cypress open  # or: npx cypress run
```

Seeding:
```bash
cd backend
npm run seed:test
```

---

## CI/CD (GitHub Actions)

Automated test pipelines:

- Backend Tests — `backend-tests.yml`
- Frontend Tests — `frontend-tests.yml`
- E2E Cypress Tests — `e2e-cypress.yml`

Features:
- DB seeding with `cy.task('db:seed')`
- Parallel Cypress execution
- Screenshots/videos as artifacts
- Runs on pushes/PRs to `main` or `dev`

---

## Documentation

- See `docs/testing-system.md` for test architecture & coverage.
- Use `docs/` for additional architecture, API, and usage docs.

---

## Contributing

Pull requests are welcome.
Please lint and test before submitting.
For major changes, open an issue first to discuss the proposal.

---

## License

MIT

---

## Quick Test Commands

```bash
npm run test               # Backend
cd frontend && npm test    # Frontend
cd frontend && npx cypress open  # E2E GUI
```
