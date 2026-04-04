# Admin Mega Menu publish-hardening (validation + storefront parity)

Scope (strict)
- strict backend validation for PUT /api/admin/mega-menu
- storefront parity so shopper-facing navbar/category rendering uses server-managed data
- validation feedback in AdminMegaMenu
- targeted backend/frontend test coverage for invalid payloads and parity

Out of scope
- AdminCategories placeholder implementation work

Acceptance Criteria
- Backend hardening
  - PUT /api/admin/mega-menu rejects invalid payloads with 422 and field-level error details (not just generic 400).
  - Valid payload persists and remains readable by GET /api/admin/mega-menu.
- Storefront parity
  - Public navbar category panel reflects backend-updated mega menu without manual localStorage intervention.
  - Hidden categories/links remain excluded in shopper view.
- Regression safety
  - Existing mega-menu integration tests remain green.
  - New tests cover at least one invalid payload case and one end-to-end parity check (admin save -> public read/render path).

Proof Path
Manual proof
1. Login as admin, open /admin/mega-menu.
2. Submit an invalid payload case (for example empty title or malformed link target), confirm clear validation error and no save.
3. Submit a valid change (rename one category and add one valid link), confirm success.
4. Open public homepage in a separate clean session, open Shop by Category, verify updated category/link appears.
5. Call GET /api/categories and verify returned menu/categories match the change.
6. Confirm audit endpoint shows the save event in /api/admin/mega-menu/audit.

Automated proof
1. Backend:
   - Run existing + new mega-menu integration tests from backend/tests/integration/megaMenuRoutes.test.js.
   - Expected: all pass; includes new 422 validation assertions.
2. Frontend:
   - Add/extend navbar test coverage (existing pattern in frontend/src/__tests__/unit/components/MerkatoNavbar.vendorSearch.test.js) to assert server-backed category rendering path.
   - Expected: updated menu values are rendered from API response and fallback behavior remains stable.
