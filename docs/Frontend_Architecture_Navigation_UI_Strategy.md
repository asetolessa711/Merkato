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
 - Layouts use CSS Modules; top nav adopts responsive grid in `MerkatoNavbar` (public).
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
- Public pages now use `MerkatoNavbar` (fixed/sticky) via `PublicLayout`.
- Customer/Vendor/Admin use legacy top bars (`NavbarUniversal`/custom) and fixed headers.
- `MerkatoFooter` present; occasionally positioned fixed in Admin.

Actions
- Migrate Customer/Vendor/Admin layouts to MerkatoNavbar variants; keep footers non-fixed by default.
- Audit any global horizontal overflows; constrain to rails/carousels.

## Footer strategy
This section consolidates the Merkato Footer Strategy and extends the layout guidance above with role-aware content, responsive behavior, and test commitments.

### Layout & page structure instructions
1) Footer placement
- Anchor the footer at the end of page content (document flow). Do not fix it to the viewport.
- Use page/layout wrappers (e.g., `PublicLayout`, `CustomerLayout`, `VendorLayout`, `AdminLayout`) so the footer naturally follows content.
- Avoid `position: fixed` for footers. Reserve fixed elements for floating CTAs (e.g., Chat, Promo banners) when essential.

2) Infinite page flow
- Support infinite vertical scrolling where applicable (product listings, search results).
- Use `overflow-y: auto` only on intended scroll containers; avoid hard height limits that could cause early footer overlap.
- Ensure the footer never blocks or overlaps dynamic content loading; load-more sentinels should appear above the footer and respect spacing.

3) Responsive grid behavior
- Use CSS Grid or Flexbox to define footer columns. Target 4 columns on desktop, 2 on tablets, and stacked sections on mobile.
- Use media queries or container queries to adapt column count and spacing.

4) Mobile collapse behavior
- Each footer section should collapse into an accordion on small screens.
- Prefer semantic `<details><summary>` or an accessible custom collapsible with keyboard support, ARIA attributes, and focus states.
- Provide clear visual affordances (chevrons) and maintain a11y naming/roles.

5) Sticky elements (optional)
- Keep top navbars sticky for search/categories/cart access.
- Avoid sticky footers unless a floating CTA is explicitly required (e.g., “Add to Cart”, “Chat with Support”).

6) Strategic notes
- Footer scales with content; it must not constrain content height.
- Mobile-first implementation; progressively enhance for larger viewports.
- Pair infinite scroll with lazy loading, intersection observers, and scroll anchors for performance/resume.
- Role-based visibility trims clutter: only show links relevant to each role.

### Universal footer structure (visible to all roles)
- Explore Merkato: About Us, Careers, Blog, Press, Telium Ecosystem
- Commerce Tools: Browse Products, Categories, Deals, Gift Cards, Promo Manager
- Help & Support: Contact Us, Help Center, Returns & Refunds, Accessibility, Privacy
- Connect With Us: Twitter, Facebook, Instagram, LinkedIn

### Role-aware footer wireframes
Public
- Explore Merkato: About Us, Careers, Blog, Press, Telium Ecosystem
- Commerce Tools: Browse Products, Categories, Deals, Gift Cards, Promo Manager
- Help & Support: Contact Us, Help Center, Returns & Refunds, Accessibility, Privacy
- Connect With Us: Twitter, Facebook, Instagram, LinkedIn

Customer
- Explore Merkato: About Us, Careers, Blog, Press, Telium Ecosystem
- Your Account: Orders, Reviews, Saved Items, Profile Settings
- Customer Services: Track Order, Return Policy, Support Chat
- Promotions: Personalized Deals, Loyalty Points, Referral Program
- Help & Support: Contact Us, Help Center, Accessibility, Privacy
- Connect With Us: Twitter, Facebook, Instagram, LinkedIn

Vendor
- Explore Merkato: About Us, Careers, Blog, Press, Telium Ecosystem
- Vendor Tools: Upload Product, Manage Inventory, View Orders, Analytics Dashboard
- Resources: Seller Help Center, Pricing Guide, API Docs
- Community: Vendor Forum, Webinars
- Help & Support: Contact Us, Help Center, Accessibility, Privacy
- Connect With Us: Twitter, Facebook, Instagram, LinkedIn

Admin (footer or sidebar alternative)
- System Tools: User Management, Moderation Queue, Logs, Campaign Manager
- Governance: Audit Trails, Role Permissions, Feature Flags
- Documentation: Internal Wiki, DevOps Playbook, Release Notes
- Help & Support: Contact Dev Team, Internal Help Center

### Component contract: `MerkatoFooter`
Proposed API
- Props
  - `role`: 'public' | 'customer' | 'vendor' | 'admin'
  - `sections?`: override structure, e.g., `{ title: string, links: Array<{ label: string, to?: string, href?: string, external?: boolean, icon?: ReactNode }>}[]`
  - `collapsibleOnMobile?`: boolean (default true)
  - `showSocialLinks?`: boolean (default true)
  - `onLinkClick?`: (meta) => void for analytics/tracking
- Behavior
  - Responsive columns: 4/2/1 (desktop/tablet/mobile)
  - Collapsible sections on mobile (semantic details/summary if feasible)
  - Keyboard accessible; maintain visible focus; adequate color contrast
- Styling
  - CSS Modules or design tokens; spacing scale (8px grid), readable typography
  - Respect `prefers-reduced-motion`; no layout shift on expand/collapse

### Implementation plan (footer)
P0
- Implement `MerkatoFooter` with universal sections and responsive grid.
- Integrate into all role layouts; ensure footer is not fixed and follows content.

P1
- Add role-aware presets for Customer, Vendor, Admin.
- Implement mobile accordion behavior with a11y support.
- Add Cypress a11y checks (critical rules) and basic E2E footer visibility tests per role.

P2
- Wire analytics via `onLinkClick` and instrument social links.
- Validate infinite scroll interactions—ensure load sentinels render above the footer.
- Optimize bundle (tree-shake icons; code-split if social widgets are heavy).

### Acceptance criteria (footer-specific)
- Footer is never `position: fixed` by default and appears after content without overlapping infinite loaders.
- Desktop shows 3–4 columns (depending on viewport), tablet 2, mobile stacked with collapsible sections.
- Mobile accordions are keyboard accessible with visible focus and ARIA labeling.
- Role presets render appropriate links without exposing irrelevant controls.
- Links to internal pages use router navigation; external links have `rel` safety and optional icons.
- A11y: no color-contrast regressions; interactive areas ≥ 48×48px on touch devices.

### E2E selector commitments (footer)
- `data-testid="footer"`
- `data-testid="footer-section-<slug>"` (e.g., `footer-section-explore-merkato`)
- `data-testid="footer-link-<slug>"` (e.g., `footer-link-orders`, `footer-link-upload-product`)
- Avoid relying solely on visible text in tests; prefer these stable selectors, with text as a secondary assert.

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
- Public: `MerkatoNavbar` implemented with brand, search, category rail, and core links.
- Customer/Vendor/Admin: `NavbarUniversal` + local headers still in use.

Actions
- Implement a configurable `MerkatoNavbar` supporting role presets:
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
- Add unit/integration tests for `MerkatoNavbar` role presets and `ProductCard` variants.

## Current → target mapping (high level)
- Navbar
  - Public: MerkatoNavbar (done) → polish + add Deals entry.
  - Customer: switch to MerkatoNavbar(role="customer").
  - Vendor: switch to MerkatoNavbar(role="vendor").
  - Admin: switch to MerkatoNavbar(role="admin") + keep sidebars.

- Routes
  - Add `/customer/*` aliases; migrate from `/account/*`.
  - Add `/search` and `/category/:slug`; deprecate `/shop` gradually.
  - Fill in missing admin subpaths aligning to strategy.

- Components
  - Hero, CustomerHero, VendorHero.
  - ProductCard variants; shared price/format utils.

## Phased implementation plan
P0 (foundation)
- Convert Customer/Vendor/Admin layouts to `MerkatoNavbar` presets without changing routes.
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

## Migration note: TemuNavbar → MerkatoNavbar
Summary
- We have replaced all references to the legacy Temu navbar with the new `MerkatoNavbar`. There is no separate "Temu" component anymore.

Scope
- Removed old file `frontend/src/components/TemuNavbar.jsx`.
- Standardized component names and documentation to use `MerkatoNavbar` across public, customer, vendor, and admin.

Compatibility
- Test selectors are unchanged to avoid breaking E2E and unit tests:
  - `data-testid="navbar"`, `data-testid="navbar-register-link"`, `data-testid="cart-link"`, `aria-label="My Account"`.
- Public behavior and layout remain compatible; role-based presets are additive.

Guidance for older branches
- If you still reference `TemuNavbar`, migrate imports to `MerkatoNavbar` and remove any leftover comments about renames.
- Prefer role presets: `<MerkatoNavbar role="public|customer|vendor|admin" />`.

QA checklist
- No occurrences of the string "Temu" remain in the repo (aside from historical commits).
- CI/E2E should pass without selector updates.

## Branding & design system (for tech‑savvy young adults)
Brand intent
- Personality: bold, clear, optimistic, tech-forward (not gimmicky). Values: speed, trust, empowerment.
- Voice & tone: concise, helpful, slightly playful in microcopy; avoid jargon walls. Example microcopy: “One tap to go.” “You’re set.”

Core identity
- Logo: geometric wordmark “Merkato” with a simple ‘M’ monogram option for app icon. Flat, no bevels. Works at 24–256px.
- Color palette (light theme)
  - Primary (Teal 500): #00B894 (consistency with current UI)
  - Primary-600/700 (Hover/Active): #00A382 / #008C70
  - Secondary (Indigo 500): #6C5CE7
  - Accent (Cyan 400): #22D3EE
  - Success/Warning/Danger/Info: #22C55E / #F59E0B / #EF4444 / #0EA5E9
  - Neutrals: #0B1220, #111827, #1F2937, #374151, #6B7280, #9CA3AF, #E5E7EB, #F3F4F6, #FFFFFF
- Color palette (dark theme)
  - Surface/Base: #0B1220 / cards #0F172A / borders #1F2937
  - Text: #E5E7EB primary / #9CA3AF secondary
  - Keep brand colors; shift saturation slightly for contrast if needed.

Typography
- Headings: Sora or Poppins (600/700)
- Body/UI: Inter (400/500)
- Mono (dev/admin): JetBrains Mono (optional)
- Accessibility: min 16px body; scale 1.125–1.2; line-height 1.4–1.6.

Shape, layout, and components
- Radius: 8–12px on cards/inputs/buttons; chips 9999px (pill)
- Shadows (elevation):
  - sm: 0 1px 2px rgba(0,0,0,0.06)
  - md: 0 6px 16px rgba(0,0,0,0.08)
  - lg: 0 10px 24px rgba(0,0,0,0.10)
- Buttons
  - Primary: Teal 500 bg/white text; hover uses Primary-600; focus ring 2px Indigo 500/outline
  - Secondary: Indigo ghost or neutral outline; hover adds subtle bg
  - Destructive: Danger 500; affirm contrast ≥ 4.5:1
- Cards: compact padding (16–20px), image-first; use skeletons and lazy-loading.
- Badges/Chips: small, high-contrast; use accent or neutrals.

Motion
- Micro interactions: 150–220ms ease-out; spring on toggles (stiffness ~220, damping ~24)
- Page transitions: subtle fades/slide-in 120–180ms; respect `prefers-reduced-motion`

Illustration, iconography & imagery
- Icons: Lucide or Remix Icon, 24px grid, 1.5–2px stroke
- Illustration: minimal 2D geometric; avoid heavy skeuomorphism
- Photography: clean lighting, real vendors/products; consistent background

Accessibility (non‑negotiables)
- Contrast: text ≥ 4.5:1 (WCAG AA), icons/controls ≥ 3:1
- Focus: always visible; 2px outline offset 2px using Secondary or Accent
- Dark mode parity: never lose contrast or semantic meaning

Design tokens (CSS variables)
```css
:root {
  --color-primary: #00B894;
  --color-primary-600: #00A382;
  --color-primary-700: #008C70;
  --color-secondary: #6C5CE7;
  --color-accent: #22D3EE;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-info: #0EA5E9;
  --color-bg: #FFFFFF;
  --color-surface: #F9FAFB;
  --color-text: #111827;
  --color-text-muted: #6B7280;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 6px 16px rgba(0,0,0,0.08);
  --shadow-lg: 0 10px 24px rgba(0,0,0,0.10);
}
[data-theme="dark"] {
  --color-bg: #0B1220;
  --color-surface: #0F172A;
  --color-text: #E5E7EB;
  --color-text-muted: #9CA3AF;
}
```

Implementation notes
- Create `frontend/src/styles/tokens.css`; load at app root. Toggle dark mode via `html[data-theme="dark"]`.
- Map tokens in CSS Modules and components; avoid hard-coded hex.
- Add a lightweight ThemeContext to toggle themes and persist preference.
- Ensure Cypress a11y checks validate contrast in both themes.

Brand copy & taglines (exploratory)
- “Shop sharp. Live smart.”
- “Fast finds. Fair deals.”
- “Build your cart. Build your world.”
- Microcopy examples: “Added to cart ✅”, “Saved for later”, “Undo”

Measurement & QA
- Track CTR on primary CTAs; dwell time on product detail; conversion by theme.
- Add Cypress checks for theme toggle, focus rings, and footer/link visibility per role.
