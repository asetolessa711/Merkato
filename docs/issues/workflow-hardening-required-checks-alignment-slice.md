# Workflow hardening: required checks and branch protection alignment

Goal
- Make required PR checks reflect real implementation risk, not only lint/format/visual checks.

Evidence baseline
- Branch protection required checks are not currently enforced on codespaces-mongo-setup-recovery or main.
- Recent PR checks are mostly governance/lint/visual checks; required backend runtime-risk gates are not aligned.
- Existing backend/frontend CI workflows are scoped to main/dev and do not align with the active recovery branch flow.
- Fast vs full E2E tiers already exist and should be explicitly policy-aligned.

Scoped slice (strict)
- required backend test check
- required frontend targeted test check
- required runtime/bootstrap smoke
- fast E2E smoke tier vs fuller E2E tier policy alignment
- branch protection alignment so red PRs cannot merge

Out of scope
- product feature changes
- taxonomy/editor/UI feature work
- replacing full CI architecture
- making full nightly E2E a required PR blocker

Acceptance Criteria
- Backend required check
  - A dedicated backend test check runs on PRs to active protected branches and reports a stable required status context.
- Frontend targeted required check
  - A dedicated frontend targeted check runs on PRs and reports a stable required status context.
- Runtime/bootstrap required check
  - A dedicated runtime/bootstrap smoke check runs on PRs and reports a stable required status context.
- E2E tier policy
  - Fast PR smoke E2E remains required.
  - Full E2E tier is explicitly non-required (nightly/workflow_dispatch only).
- Branch protection alignment
  - Branch protection required status checks include backend required, frontend targeted required, runtime/bootstrap smoke, and fast E2E smoke contexts.
  - PRs with failing required contexts are not mergeable.

Proof Path
Manual proof
1. Open a test PR against codespaces-mongo-setup-recovery.
2. Confirm required checks list includes backend required, frontend targeted, runtime/bootstrap smoke, and fast E2E smoke.
3. Intentionally fail one required check in the PR and verify merge is blocked.
4. Fix the failing check; verify required checks turn green and PR becomes mergeable.
5. Confirm full nightly E2E remains available but does not block PR merge.

Automated proof
1. Workflow validation
   - New/updated workflow files pass YAML lint and execute on PR trigger with expected check names.
2. Branch protection validation
   - API verification shows required contexts configured on target branches.
3. Regression validation
   - Existing governance/lint/visual checks continue to run unchanged.
