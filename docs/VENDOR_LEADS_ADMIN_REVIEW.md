# Vendor Leads Admin Review

This document summarizes the admin-side review flow for vendor leads and the current implementation status.

## Endpoints (backend)
- GET /api/admin/vendors/leads — list leads, accepts optional `status` query. Returns VendorLead[] sorted by newest.
- POST /api/admin/vendors/leads — create a lead (admin seeding, not used by public form).
- PUT /api/admin/vendors/leads/:id — update a lead. Supports fields like `status` (new|reviewed|invited|rejected), `assigned_to`, and `notes`.
- POST /api/admin/vendors/invite/:leadId — issues a secure invite token (JWT) stored in InviteToken with TTL; updates lead status to `invited`.

Models:
- VendorLead: includes `status` enum (new, reviewed, invited, rejected), `assigned_to`, `notes`.
- InviteToken: `token`, `expiresAt` (TTL index), `used`/`usedAt`, `leadId`.

## Frontend
- Route: `/admin/vendors/leads` renders `AdminVendorLeads` (protected to role=admin).
- Features:
  - List vendor leads with basic details.
  - Status filter (All, New, Reviewed, Invited, Rejected).
  - Actions per row: Invite, Mark Reviewed, Reject.
  - Assign onboarding agent via dropdown (populated from `/api/admin/users` filtered to admin/global_admin/staff).
  - After actions, list refreshes.

## Notes / Follow-ups
- Consent field: The public registration UI no longer collects a consent checkbox; the backend `VendorLead` still has a `consent` boolean. Consider making this field optional and derived from submission legal copy rather than explicit checkbox, or remove it if redundant.
- Optional enhancement: Populate `assigned_to` when listing leads to show assignee details inline (name/email) without relying on the admin list in the dropdown.
