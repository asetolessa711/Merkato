Baseline Test Guardrails

- Purpose: lock in a known-good set of passing tests and fail CI if any regress.
- How to create baseline (run once when green enough):
  npm run test:baseline:record
- How to verify on every PR/commit:
  npm run test:baseline:verify

Notes
- Uses Jest's JSON output to diff passed assertion names (fullName).
- Does not block adding new tests; it only ensures previously passing tests stay passing.
- You can regenerate the baseline when intentionally changing behavior after review.
