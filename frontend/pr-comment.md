### ✅ PR E2E Smoke Summary
All selected smoke specs passed (10 tests across 6 specs). No flakes detected.

Environment: db=merkato_e2e api=http://localhost:5051
Discovered specs: 27  | Selected smoke specs: 6 (tag include: smoke; exclude: flaky)

Selected Specs:
1. adminOrdersBulkActions.cy.js
2. basic_navigation.cy.js
3. cart_checkout_button.cy.js
4. frictionless_checkout.cy.js
5. returns_refunds_flow.cy.js
6. vendorOrdersBulkActions.cy.js

### ⏱ Performance & Governance
Total runtime (sum of spec durations): 21.0s (budget 180s OK)
Top spec share threshold (40%) triggered.

Warnings:
- ABS: adminOrdersBulkActions.cy.js 8472ms > 8000ms guideline
- HEAVY: adminOrdersBulkActions.cy.js 40.2% of total (>=40%) – candidate for split (dialogs vs status ops?)
- DRIFT: cart_checkout_button.cy.js grew 1.97x median (1113ms -> 2196ms)

Spec Timing vs Median:
- adminOrdersBulkActions: 8.47s (median 7.36s, +1.11s, x1.15)
- frictionless_checkout: 3.88s (median 3.65s, +0.23s, x1.06)
- returns_refunds_flow: 3.78s (median 3.27s, +0.52s, x1.16)
- cart_checkout_button: 2.20s (median 1.11s, +1.08s, x1.97) ⚠
- vendorOrdersBulkActions: 1.85s (median 1.60s, +0.26s, x1.16)
- basic_navigation: 0.87s (median 0.62s, +0.25s, x1.39)

Runtime Share Heatmap:
| Spec | Share |
|------|-------|
| adminOrdersBulkActions | 40.2% |
| frictionless_checkout  | 18.4% |
| returns_refunds_flow   | 18.0% |
| cart_checkout_button   | 10.4% |
| vendorOrdersBulkActions| 8.8%  |
| basic_navigation       | 4.1%  |

### 🧪 Candidate Spec Timing (Not in Smoke Yet)
From latest capture (`capture-candidate-specs-report.md`):
- vendor_product_upload.cy.js median 5385ms (would raise total to ~26.4s; projected share ~20%)
- vendor_forbidden_action.cy.js median 2855ms (new total ~23.9s; share ~12%)
- customer_checkout.cy.js median 5703ms (new total ~26.8s; share ~21%)
- customerFlow.cy.js median 9562ms (new total ~30.6s; share ~31%) – heavy; keep gated
- auth_roles.cy.js median 16961ms (new total ~38.0s; share ~45%) – far too heavy for smoke
- adminOrdersBulkDialogs.cy.js median 6353ms (new total ~27.4s; share ~23%) – overlap with existing bulk actions; consider splitting strategy first

Recommendation Gate:
- Safe to include next (impact low): vendor_forbidden_action.cy.js (adds ~2.9s net +12% share)
- Defer until adminOrdersBulkActions split: vendor_product_upload, customer_checkout (would push a single spec >30% share threshold if current heavy unchanged)
- Keep excluded (too heavy): customerFlow, auth_roles

### 🎯 Actionable Follow-Ups
1. Split adminOrdersBulkActions into (a) status ops (b) modal dialogs to reduce single-spec dominance.
2. Investigate cart_checkout_button drift (network variance vs added assertions). Capture HAR or add timing markers.
3. Add vendor_forbidden_action to smoke after (1) if stability confirmed (projected total ~23.9s still trivial vs budget).
4. Re-run candidate timing after split to reassess inclusion of vendor_product_upload.

### 📦 Artifacts
Primary JSON reports: cypress-report.json, cypress-report_001..005.json
No quarantined (@flaky) specs.

_Automated governance comment v2 — refinement adds candidate timing gate + prioritized actions._