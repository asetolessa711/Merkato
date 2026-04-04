# Backend testing

- Jest loads `.env.test.local` then `.env.test` via `jest.env.setup.js`.
- In CI, the workflow creates `backend/.env.test` before running tests.
- Locally, you can copy `.env.test.example` to `.env.test` or rely on defaults:
  - `MONGO_URI_TEST` defaults to `mongodb://127.0.0.1:27017/merkato_test`
  - Jest forces `MONGO_URI` to the canonical test URI (`MONGO_URI_TEST` fallback) to avoid hitting dev data
  - `EMAIL_USER`/`EMAIL_PASS` default to test values, and nodemailer is mocked
  - `OPENAI_API_KEY` can be empty; Codex features are disabled during tests
  - If `TEST_*_TOKEN` are missing, tests synthesize short-lived JWTs where supported

Tips:
- To avoid port/db conflicts during local e2e, prefer the E2E runner which uses ephemeral DB names.
- If you see ENOENT for `.env.test` in CI, confirm the workflow’s “Create backend/.env.test” step exists.