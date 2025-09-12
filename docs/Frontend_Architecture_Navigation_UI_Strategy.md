# Merkato Frontend Architecture, Navigation & UI Strategy

Last updated: 2025-09-13

## Overview
Merkato’s frontend aims to deliver a seamless, role-aware experience across public, customer, vendor, and admin surfaces. This strategy codifies layout standards, responsive behaviors, navigation patterns, semantic URL architecture, and UI component guidelines (hero, product cards, etc.) to ensure clarity, accessibility, performance, and trust.

This document also maps the target strategy to the current codebase to highlight what’s done, what’s missing, and a phased plan to close gaps.

## Device flexibility & responsive design
Principles
- Use CSS Grid/Flexbox; prefer utility classes or CSS Modules for consistency.
- Apply media queries to adapt typography, spacing, visibility.
- Touch targets ≥ 48×48px; large tap areas on mobile.
- Hamburger/drawers for small screens; avoid hidden, unreachable nav.
- Performance first: code split, lazy-load heavy modules; optimize images; prevent layout shifts.

Status in repo
- Layouts use CSS Modules; top nav adopts responsive grid in `TemuNavbar` (public).
- Some fixed bars disabled during E2E via test-only CSS (in `App.js`).
- Image optimization and code-splitting not consistently applied.

Actions
- Introduce `React.lazy` + `Suspense` for low-frequency routes (admin/vendor subsections).
- Add responsive helpers and spacing scale to CSS Modules (or adopt Tailwind incrementally).
- Enforce minimum touch sizes on nav and primary buttons.

## Layout best practices
Fixed navigation bar
- Use sticky/fixed top navbar for persistent access to search, categories, account/cart.

Footer placement
- Footer appears after all content, not pinned to viewport unless explicitly needed.

Scroll behavior
- Vertical scroll always enabled; horizontal scroll only within intended containers (e.g., category rails, carousels).

Status in repo
- Public pages now use `TemuNavbar` (fixed/sticky) via `PublicLayout`.
- Customer/Vendor/Admin use legacy top bars (`NavbarUniversal`/custom) and fixed headers.
- `MerkatoFooter` present; occasionally positioned fixed in Admin.

Actions
- Migrate Customer/Vendor/Admin layouts to Temu-style nav variants; keep footers non-fixed by default.
- Audit any global horizontal overflows; constrain to rails/carousels.

## Hero section strategy
Purpose
- Showcase featured products, seasonal campaigns, or promos; drive engagement and brand identity.

Placement
- Public: top of homepage (above listings).
- Customer: dashboard/landing (personalized when possible).

Design
- Bold imagery with clear CTA (Shop Now / Explore Deals).
- Responsive images; alt text; semantic structure.
- Optional rotation (carousel) with accessible controls.

Status in repo
- Homepage includes banners but not standardized hero.

Actions
- Create `Hero` component with accessible carousel option and CTA slots.
- Add `CustomerHero` variant for personalized cards/promos.

## Product card best practices
Purpose
- Compact, engaging product summary with role-dependent actions.

Display contexts
- Public: homepage, categories, search results.
- Customer: dashboard, recommendations, order history.
- Vendor: product management (editable variant).

Design
- Image, title, price, short description, primary actions (Add to Cart, View Details).
- Consistent sizing/spacing; responsive stacking; keyboard accessible; readable contrast.
- Variants: display, editable, reviewable.

Contract (proposed)
- Props: { id, title, price, imageSrc, currency, rating?, badge?, onAddToCart?, onEdit?, variant: 'display'|'editable'|'reviewable' }

Status in repo
- `ProductCard.js` exists; needs variant unification and cleanup (eslint warns about unused fields).

Actions
- Refactor `ProductCard` to support variants; add tests and a11y checks; remove unused code.

## URL architecture best practices
Public
- `/` → Home
- `/category/:slug` → Category landing
- `/product/:id` → Product detail
- `/search?q=term` → Search results
- `/login`, `/register`, `/cart`, `/help`, `/privacy`

Customer
- `/customer/dashboard`
- `/customer/orders`, `/customer/profile`, `/customer/reviews`, `/customer/returns`

Vendor
- `/vendor/dashboard`, `/vendor/products`, `/vendor/orders`, `/vendor/upload`, `/vendor/analytics`

Admin
- `/admin` (dashboard), `/admin/orders`, `/admin/users`, `/admin/moderation`, `/admin/promos`, `/admin/feedback`

Status in repo (current vs target)
- Public listing: uses `/shop` (OK temporarily). Target is `/category/:slug` and `/search`.
- Product detail: `/product/:id` already present.
- Customer area: `/account/*` → target `/customer/*`.
- Vendor area: `/vendor/*` (close to target; add `/vendor/upload`).
- Admin area: `/admin/*` (close to target; align subpaths).

Migration plan
- Add route aliases and 301-like redirects: `/account/*` → `/customer/*`; `/shop` → `/search` (when search page lands) and `/category/:slug`.
- Update navbar links and breadcrumbs after routes land.
- Maintain old paths during a deprecation window to avoid breaking deep links.

## Role-based navigation bar design
Public items
- Home, Deals, Categories rail, Search, Login/Register, Cart.

Customer items
- Dashboard, My Orders, My Reviews, Returns & Refunds, Profile, Logout.

Vendor items
- Dashboard, Manage Products, Manage Orders, Upload Product, Analytics, Logout.

Admin items
- Admin Dashboard, User Management, Order Moderation, Campaigns/Promos, Feedback Inbox, System Logs, Logout.

Status in repo
- Public: `TemuNavbar` implemented with brand, search, category rail, and core links.
- Customer/Vendor/Admin: `NavbarUniversal` + local headers still in use.

Actions
- Implement a configurable `TemuNavbar` supporting role presets:
  - `role="public"|"customer"|"vendor"|"admin"` with item config and optional quick menus.
- Replace navbars in role layouts; preserve current test selectors and add stable test IDs.

## Navigation flow & page transitions
Best practices
- React Router v6 with role-based layout wrappers (already in place).
- Breadcrumbs on nested pages.
- Back buttons on detail views.
- Persistent nav bars; floating action buttons for key tasks.
- Deep links supported on all devices.

Status in repo
- Role-based wrappers exist (`PublicLayout`, `CustomerLayout`, `VendorLayout`, `AdminLayout`).
- `Breadcrumb` component exists but underused.

Actions
- Add breadcrumbs to key nested pages (orders, products, invoices, support).
- Add contextual FABs (e.g., Upload Product on vendor product list).

## Accessibility & performance
- Accessibility: continue cypress-axe checks; maintain “critical-only” CI gate with observability-first expansion.
- Performance: adopt code splitting, image optimization, and avoid layout shift in hero/carousels.
- Keyboard navigation and ARIA semantics on menus, search, category rails.

Status in repo
- a11y checks integrated and enforced on curated suites.
- Some `jsx-a11y` warnings remain; many `no-unused-vars` across pages.

Actions
- Resolve ESLint warnings (unused vars/imports; redundant roles).
- Add ARIA patterns to dropdowns/menus; ensure search has label.

## Governance & testing alignment
- Behavioral Thread Mapping (baseline/strict) with sticky PR comments.
- A11Y gate in PRs with summaries.
- E2E selectors stabilized in navbar and key flows.

Actions
- Extend a11y suites to new hero and nav variants.
- Add unit/integration tests for `TemuNavbar` role presets and `ProductCard` variants.

## Current → target mapping (high level)
- Navbar
  - Public: TemuNavbar (done) → polish + add Deals entry.
  - Customer: switch to TemuNavbar(role="customer").
  - Vendor: switch to TemuNavbar(role="vendor").
  - Admin: switch to TemuNavbar(role="admin") + keep sidebars.

- Routes
  - Add `/customer/*` aliases; migrate from `/account/*`.
  - Add `/search` and `/category/:slug`; deprecate `/shop` gradually.
  - Fill in missing admin subpaths aligning to strategy.

- Components
  - Hero, CustomerHero, VendorHero.
  - ProductCard variants; shared price/format utils.

## Phased implementation plan
P0 (foundation)
- Convert Customer/Vendor/Admin layouts to `TemuNavbar` presets without changing routes.
- Add `Hero` to homepage; add `CustomerHero` to dashboard.
- Clean up ESLint warnings in touched files.

P1 (routing & discoverability)
- Introduce `/customer/*` route alias with redirects; update nav/breadcrumbs.
- Add `/search` page that consumes the global search param.
- Add `/category/:slug`; have category rail link to it; keep `/shop` during deprecation.

P2 (UX polish & performance)
- Add breadcrumbs to nested pages; introduce contextual FABs.
- Code-split admin/vendor subsections; apply image optimization to hero/cards.

P3 (governance & a11y expansion)
- Extend a11y coverage to hero/carousels, category rail, and new routes.
- Add unit tests for navbar role presets and `ProductCard` variants.

## Acceptance criteria (sampling)
- Navbar (public): visible on scroll, accessible search with label, category rail keyboard accessible.
- Navbar (role): shows correct items; logout clears session; deep links work.
- Hero: responsive images, alt text, no layout shift; CTA navigates correctly.
- ProductCard: consistent layout, variant behaviors covered by tests.
- URLs: aliases resolve; redirects in place; breadcrumbs reflect path.

## E2E selector commitments
- `data-testid="navbar"`, `data-testid="navbar-register-link"`, `data-testid="cart-link"`, `aria-label="My Account"` remain stable.
- Add test IDs for hero CTA and product card actions when introduced.

## Notes
- Keep observability-first approach for a11y; only enforce after stabilizing flows.
- Preserve backward-compatible routes during migration windows.
- Document UX decisions in this file; link PRs to specific checklist items.
