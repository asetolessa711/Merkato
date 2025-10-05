# Marketing Manager Manual

This guide walks administrators and marketing managers through configuring and operating Micro‑banners and Hero Banners safely and confidently—all without touching code.

> Scope: Admin-only tools. Nothing here changes the public site until you publish your content.

## 1) Accessing the Marketing Manager

- Sign in with an admin account.
- Navigate to: Admin → Marketing Manager.
- You’ll find two main areas: Micro-banners and Hero banners. Each has a live preview and controls on the same page.

## 2) Key Concepts

- Draft vs Published
  - New items start as Draft by default. Drafts are visible in Preview (when “Include drafts” is checked) but are not shown to real users until published.
- Resolver and caps
  - The runtime resolver selects at most 6 hero slides for the current page/context, ordered by Priority (lowest number = higher priority). If more than 6 match, the extras won’t show publicly.
- Targeting and schedule
  - You can limit visibility by pages, user roles, language, and regions, and by date/time windows (Start/End). Quick presets help with common ranges.
- Guardrails (Editor Checks)
  - The editor highlights common issues like long headlines, missing alt text, missing CTA links, overlapping roles, or invalid schedules.
- Metrics (local)
  - The system tracks impressions and clicks in local storage for your machine—great for spot checks and A/B sanity, not a full analytics replacement.

## 3) Live Preview Toolbar

- Device selector: Desktop / Tablet / Mobile
- Zoom: Fit to window (auto) or manual (100%, 90%, 75%, 67%, 50%, 33%)
- Route: Choose a preset route or type a custom path (e.g., /shop, /deals)
- Include drafts in preview: Show Draft items so you can validate before publishing
- Allow navigation: Enable to click CTAs/links within the preview
- Note: Preview can show content even for contexts where production suppresses banners (e.g., checkout/auth) so you can validate visuals.

## 4) Micro‑banners

- Placement: Between the Navbar and Hero Bar (not on Checkout).
- Common fields/options:
  - Copy and CTA
  - Targeting (pages, roles, languages, regions)
  - Scheduling window with presets
  - Frequency controls and trust/dismiss options
  - “Sticky on desktop only” option
- Tonal separation: Light design rules keep it distinct from the hero without changing site layout.
- Metrics: Impressions/clicks tracked locally. Reset from the metrics panel if needed.

## 5) Hero Banners

### 5.1 Create or manage slides

- Click “+ New hero slide” to create a Draft immediately.
- Or use “New from template” to start from a saved template or a background preset.
- The Slides list shows All/Published/Drafts with quick filters. Use the arrows to reorder.
- Toggle Publish/Unpublish or Duplicate from the list.

### 5.2 Edit slide content

- Status: Mark Draft or Publish from the editor header.
- Title and Subtitle: Keep copy concise; Editor Checks will flag long copy.
- Layouts: Choose from Copy + Image Right, Image Left + Copy, Split 50/50, Copy Only, or Image Only.
- Images:
  - Provide Desktop, Tablet, and Mobile images if possible for best framing.
  - Set Image Alt for accessibility.
  - Use the Image focal point grid to hint the important area of the image.
  - Quick uploads: Use the preview overlay or the bulk upload to create slides from multiple images quickly.
- Background preset: Choose a background theme.
- Priority: Lower numbers are shown first when multiple slides are eligible. Use “Distribute priorities” if you see tie warnings.
- CTAs:
  - Primary and secondary CTAs support text and links.
  - UTM builder: Optionally append utm_source, utm_medium, and utm_campaign on Save. We only add params if missing and keep your existing query/hash.
- Schedule: Set Start/End; use quick presets (Today, This weekend, 7 days).
- Targeting: Pages (comma-separated), Roles (pick one or “all”), Language, Regions (multi-select).

### 5.3 Templates

- Save as Template: From an editing slide, click “Save as Template,” name it, and it will be stored locally.
- Use a Template: “New from template” → pick your saved template (creates a fresh Draft immediately).
- Delete a Template: Use the ✕ action in the template list.
- Rename: Not available yet—workaround is delete then save-as-template with a new name.

### 5.4 Preview and safety

- Use the Preview toolbar to switch devices, routes, and zoom. Keep “Include drafts” enabled while iterating.
- If more than 6 slides match a context, a banner warns you. Use “Distribute priorities” for deterministic ordering.
- A warning appears if production would suppress banners on checkout/auth.

### 5.5 Metrics

- Per-slide: Impressions, Clicks, and CTR shown in the Metrics panel; also shows top paths by impressions.
- Reset Metrics: Clears local counters to re-measure fresh changes.
- Note: These are local-only metrics (for your device), suitable for validation and quick A/B checks.

## 6) Publish Workflow (Recommended)

1) Create slides as Drafts and iterate in Preview with “Include drafts” on.
2) Validate on Desktop/Tablet/Mobile with Fit to window; sanity-check on your target routes.
3) Run Editor Checks and resolve warnings where practical.
4) Verify targeting (pages/roles/language/regions) and schedule windows.
5) Resolve priority ties; use “Distribute priorities” if needed.
6) Publish when satisfied. Optionally reset metrics and do a quick smoke-test.

## 7) Troubleshooting

- I don’t see my slide in preview:
  - Ensure “Include drafts” is checked (if it’s a Draft).
  - Check route: is the page included in “Pages” targeting?
  - Check schedule window (Start/End vs now) and timezone.
  - Check roles/language/regions targeting.
  - Look for the “>6 slides” warning; prioritize appropriately.
- Image not showing:
  - Verify the URL loads in a new tab and is accessible. Try re-uploading.
  - Provide tablet/mobile images if desktop crops awkwardly.
  - Set Image Alt for accessibility; review focal point.
- CTA issues:
  - Ensure CTA text and href are both provided. Editor Checks will flag mismatches.
  - If using the UTM builder, Save to apply parameters.
- Uploads failing:
  - Ensure you are logged in (token present). Try reloading the Admin page and retrying.
- Metrics seem wrong:
  - Remember they’re local to your browser. Reset metrics and retry.
- Nothing changes on the live site:
  - Confirm the slide is Published and matches the live page’s targeting and schedule. Drafts never show publicly.

## 8) Best Practices

- Keep headlines under ~60 characters; subheads under ~120.
- Provide mobile‑optimized images and set the focal point.
- Always write descriptive alt text for images.
- Keep primary CTA copy short (≤ 18 chars is ideal) and meaningful.
- Use templates to speed up recurring campaigns and ensure consistency.
- Avoid targeting checkout/auth pages for promotions; minimize friction.
- Use schedule presets to avoid stale promos lingering.
- Use priorities like 0, 10, 20… to leave room for future inserts.

## 9) FAQ

- Q: How many hero slides can show at once?
  - A: Up to 6 per context; the highest‑priority (lowest number) eligible slides.
- Q: Can I preview Drafts?
  - A: Yes—toggle “Include drafts in preview.” Drafts never appear to real users until published.
- Q: Does zoom affect production?
  - A: No. Zoom is admin‑only and changes preview scaling only.
- Q: Can I rename templates?
  - A: Not yet. Delete and re‑save with a new name as a workaround.

---

If you need help or want to propose improvements, please add notes to the internal docs or open a ticket in the repo.

## Rails Classification (6 Steps) + Display Policy

Last updated: September 26, 2025

This section combines a quick, operator-grade 6-step cleanup for the Rails Registry with a consistent Display Policy so Marketing can classify rails, and the selector can rank and render them in a predictable, revenue-smart order.

### Part 1 — 6‑Step Cleanup & Classification

1) Normalize placements
- Rename legacy keys to a fixed taxonomy: HeroTop, HeroBelow, Mid, CategoryTop, CategoryMid, DealsPage, PDP, Cart, CollectionPage, SearchResults.

2) Bulk‑classify existing rails
- Set tactic for every Prod/Active rail using these options only: Curated, DealsHub, BrandSpotlight, CrossSell, Collection, Sponsored.

3) Activation guardrails
- Block status=Active for env=Prod unless tactic + placement + owner are set. Sponsored requires capSitePct/capPerRailPct. HeroTop forbids Sponsored. PDP/Cart must be CrossSell.

4) Saved Views that actually filter
- Presets: Curated, Deals, Brand, Cross‑sell, Collections, Sponsored — prefill tactic + allowed placements + env=Prod + status=Active. Show chip counts.

5) Surface conflicts & hide noise
- Show a Conflict chip when >1 active rail targets a single‑slot (e.g., CategoryTop). Default hide Unclassified; offer a “Classify rails (N)” link.

6) Make Metrics feel different from Registry
- Registry shows edit actions/badges; Metrics shows KPIs and a Health chip (Good/Watch/Action). Option: hide zero‑traffic rails for the selected window.

### Placement Taxonomy (Canonical Keys)

- Home: HeroTop, HeroBelow, Mid, Footer
- Category: CategoryTop, CategoryMid
- Deals: DealsTop, DealsTierRow
- Brand: BrandPageHero, BrandPageMid
- Search: SearchResults
- PDP/Cart: PDP, Cart
- Collections: CollectionHero, CollectionMid, CollectionPage

### Part 2 — Display Policy (Ranking & Slots)

Core Ideas
- Slots are fixed; eligible rails compete to fill them.
- Ranking Score prioritizes RPM, then CTR, then ATC Rate, with a small Freshness bonus.
- Guardrails keep UX clean: Sponsored caps, one CategoryTop, item de‑dup, inventory/region aware.

#### A) Home Page

Slots (desktop):
- HeroTop (1) — Curated or BrandSpotlight (no Sponsored)
- HeroBelow (1–2) — Curated / DealsHub / BrandSpotlight (no Sponsored)
- Mid (2–3) — Curated / DealsHub / Sponsored (caps apply)
- Footer (0–2) — Sponsored / Collections

Selection rules:
- HeroTop: pick highest Score among Curated/BrandSpotlight; if tie within 10%, prefer Freshness (not shown in the last 3 days).
- HeroBelow: require RPM ≥ site median or CTR ≥ p50; else fallback to best Curated by CTR.
- Mid: rank by Score with diversity (max one rail per category/brand in this band) and Sponsored caps (site ≤20%, per‑rail ≤30%).
- Footer: Sponsored/Collections only if RPM ≥ bottom‑quartile cutoff.

Tie‑breakers (order): RPM → CTR → ATC Rate → Freshness → small random jitter (1–2%).

#### B) Category Page

Slots: CategoryTop (exactly 1) → CategoryPromo (or Curated if none), CategoryMid (1–2) → Curated / DealsHub / Sponsored (caps).

Rules:
- CategoryTop: choose highest Score among promos targeting this category; block Sponsored.
- CategoryMid: same diversity rule; Sponsored allowed within caps.

#### C) Deals Hub

- DealsTop (1): highest Score among DealsHub rails. DealsTierRow (N): sort by effective RPM within tier; cap duplicate brands.

#### D) Brand Page

- BrandSpotlight only; rank by RPM; require in‑stock ≥95% for the brand’s feed.

#### E) PDP & Cart (Cross‑sell)

- PDP: choose CrossSell rail with highest Attach Rate; tie‑break on AOV Lift. Cart: prefer “More from brand”; if attach < baseline, switch to FBT.

#### F) Mobile Adaptations

- HeroBelow collapses to 1; Mid band max 2; same ranking and caps; ensure copy length fits.

#### G) Guardrails & Hygiene

- Sponsored never in HeroTop / CategoryTop; enforce site 20% and per‑rail 30% Share of Voice caps.
- Exactly one CategoryTop per category.
- De‑duplicate products across visible rails on a page.
- Inventory/region aware before ranking (filter OOS or non‑deliverable SKUs).
- Zero‑traffic suppression: do not promote to Hero slots if Impressions < 200 over 7d.
- Quality floor: hide rails with RPM < bottom‑quartile unless needed to fill a slot.

#### H) Ranking Score (no code formula)

Score = RPM_norm × 0.6 + CTR_norm × 0.3 + ATC_Rate_norm × 0.1 + FreshnessBonus − Penalties

Normalize metrics to 0–1 using 7d site min–max; FreshnessBonus +0.03 if not in that slot for 3 days; Penalty −0.05 if CTR drop > 2pp vs 28d baseline (2 days).

#### I) Fallbacks

- If no candidate meets floors for a slot, backfill with best Curated by CTR.
- If still empty, render a skeleton or safe editorial rail to avoid layout jumps.

#### J) Operator Knobs (tunable in config)

- Caps: site cap (default 20%), per‑rail cap (default 30%).
- Floors: hero impressions floor (200 over 7d), RPM bottom‑quartile cutoff.
- Weights: adjust Score weights (RPM/CTR/ATC Rate) in ±0.1 steps.

#### K) Acceptance Checks (QA)

- No Sponsored in HeroTop/CategoryTop; one CategoryTop per category.
- Sponsored Share of Voice respects caps (site and per‑rail).
- No duplicate product tiles across rails on a page.
- Displayed order within each slot band matches descending Score after filters.
- Mobile shows fewer slots but preserves ordering logic.

##### Appendix — Quick Mapping Examples

- Baseline Rail A → tactic=Curated, placement=HeroBelow, owner=Marketing
- Supp/Cap rails → tactic=Sponsored, placement=HeroBelow, badges CAP_PER_RAIL/CAP_SITE as applicable
- Session rails → tactic=CrossSell (or env=Staging/Dev if audit)
- Seasonal rails → tactic=Collection; Brand spotlight → tactic=BrandSpotlight

## 10) Expansion Roadmap: High‑Leverage Marketing Surfaces

The current toolset (Micro‑banners + Hero Banners) is Phase 0 of a broader, still no‑code, action‑oriented merchandising platform. Below is the prioritized rollout, what each surface does, where it lives, who owns it, and how we measure success.

### 10.1 Phase 1 (Ship Next)
Fastest impact; minimal new infra. All Phase 1 surfaces can reuse existing local storage pattern + resolver principles.

| Surface | Purpose | Placement | Ownership | Primary Metrics |
|---------|---------|-----------|-----------|-----------------|
| Curated Rails (Featured / New / Best Sellers / Trending / Staff Picks) | Increase browse depth & conversion via scannable product clusters | Home (below hero), Category top & mid-page slots | Admin curates (Marketing) | Rail impressions, Rail CTR, Add‑to‑Cart (ATC) from rail, Revenue per rail |
| Deals Hub | Centralize all active promos/deals for discovery | Dedicated /deals page | Admin aggregates; Vendors submit deals | Visits, Filter/segment usage, ATC, Revenue share of site |
| Free‑Shipping Threshold Nudge | Lift AOV by encouraging incremental spend | Cart page (progress bar / message above items) | Admin sets region thresholds | AOV lift, % orders hitting threshold, Free‑ship utilization |
| Sponsored Products (Limited) | Monetize discovery slots w/ integrity | Specific rail slots (e.g., slot 3 in home Featured; search results top) | Admin sets placements & caps; Vendors request | Sponsored impressions, CTR, ROAS, Share of voice |
| Abandoned Cart Email (basic) | Recover lost carts quickly | Lifecycle (Email) | System trigger + Admin template | Recovery rate, Revenue recovered |

### 10.2 Phase 2 (2–4 Weeks After Phase 1)

| Surface | Purpose | Placement | Ownership | Metrics |
|---------|---------|-----------|-----------|---------|
| Brand Spotlights & Brand Pages | Elevate strategic brands; allow brand storytelling | Home brand card + /brand/{slug} landing | Admin slots; vendor supplies assets | Brand card CTR, Brand page ATC |
| Price‑Drop / Back‑in‑Stock Alerts | Drive re‑engagement on intent signals | Email / Push | Event system; Admin cadence | Alert opt‑ins, Alert CTR, Conversion rate |
| Referral Program (basic) | Low‑cost acquisition via customers | Account → Refer page | Admin program rules | Referrals sent, Referrals converted, CAC vs baseline |
| Simple Coupons | Stimulate trial / targeted boosts | Cart & Checkout entry | Admin (global/category); Vendors (guarded) | Redemptions, Margin impact, AOV shift |

### 10.3 Phase 3 (Later / Richer Data Needed)

| Surface | Purpose | Placement | Ownership | Metrics |
|---------|---------|-----------|-----------|---------|
| Loyalty / Points | Increase retention & frequency | Account, Cart (points info), Checkout | Admin + Finance | Enrollment, Redemption rate, Purchase frequency |
| Advanced Affiliate Program | Expand acquisition via external partners | External links to tracked landings | Admin + Finance | Affiliate CAC, ROAS, LTV of referred |
| Bundles / Kits | Lift AOV & cross‑category attach | PDP (“Bundle & Save”), Category promos | Vendors create; Admin features | Bundle attach rate, Margin |
| PDP Cross‑Sell Automation | Raise attach rate | PDP (“Similar / FBT”), Cart upsell row | System rules + Admin overrides | Attach rate, AOV lift |

### 10.4 Ownership Matrix (Extended)

| Tactic | Admin | Vendor | System |
|--------|-------|--------|--------|
| Micro‑banner / Hero | Create, target, schedule, publish | — | Resolver + caps |
| Curated Rails | Curate & order | (Future: suggest SKUs) | Impression/CTR tracking |
| Deals Hub | Aggregate & approve | Submit deals | Normalize & filter active deals |
| Sponsored Products | Placements, caps, approval | Request slots/budget | Enforce frequency & ad label |
| Coupons (Global/Category) | Create rules | Vendor‑scoped within guardrails | Validate stackability/margin |
| Brand Spotlights | Slot & curate | Provide assets/info | Track brand metrics |
| Lifecycle Emails | Templates, triggers | — | Send + opt‑out compliance |
| Abandoned Cart Email | Template + timing | — | Detect carts & send |
| Price / Stock Alerts | Cadence windows | — | Event trigger & dedupe |
| Referral Program | Rules, rewards | — | Code/link generation |
| Loyalty / Points | Program params | — | Balance ledger & accrual |
| Bundles / Kits | Feature/approve | Create/manage kits | Bundle pricing & inventory check |

### 10.5 Guardrails (Extended)
Additions to existing guardrails:
1. Always label ads with “Sponsored” (aria‑label and visible text).
2. Max 1 sponsored tile per viewport (initial load) per rail; frequency cap per session.
3. No marketing promos on Checkout/Auth except trust, security, progress.
4. Respect inventory & deliver‑to region: do not surface out‑of‑stock or region‑ineligible items.
5. Track and enforce category margin tolerance (flag rails exceeding discount budgets).
6. Rails must have a min 2, max 12 items (prevent sparse or overwhelming rails).
7. Free‑shipping progress must reflect post‑discount subtotal (avoid misleading nudges).
8. Abandoned cart emails: cap at 2 touches per cart (no spam); second may include incentive.
9. Referral & coupon stacking: enforce precedence (e.g., referral credit not doubled with new user coupon unless explicitly allowed).
10. Accessibility: All dynamic inserts (rails, sponsored tiles) must include proper roles/labels and keyboard traversal order.

### 10.6 Metrics Minimum Viable Set (Weekly Ops Dashboard)
Header funnel: search usage, hero CTR, micro‑banner CTR
Rails: impressions, CTR, ATC, revenue per rail
Deals Hub: sessions, ATC, revenue share
Sponsored: impressions, CTR, ROAS, share of voice (sponsored tiles / total tiles)
Lifecycle: abandoned cart recovery %, back‑in‑stock conversions
Growth: referrals sent/converted, points redeemed
Customer: AOV, purchase frequency, 7‑day & 28‑day retention

## 11) Implementation Blueprint (Internal) – Phase 1 Details

Goal: Introduce Phase 1 surfaces incrementally without destabilizing existing Hero/Micro systems. Reuse existing design patterns: local storage collections, resolver, metrics counters.

### 11.1 Shared Data Model Primitives
We can extend the existing `heroBanners` local storage module pattern into a generalized Marketing Store:
```
marketingStore = {
  heroes: [...],
  microBanners: [...],
  rails: {
    // key = railId (e.g., 'featured_home', 'best_sellers_kitchen')
    [railId]: {
      id, title, status: 'draft'|'published',
      placement: { page: 'home'|'category', slot: 'below_hero'|'mid_1'|'mid_2' },
      type: 'featured'|'new'|'best_sellers'|'trending'|'staff_picks'|'sponsored_mix',
      items: [ { sku, reason? ('sponsored'|'manual'|'rule'), weight? } ],
      targeting: { categories?:[], roles?:[], regions?:[], languages?:[] },
      schedule: { start?, end? },
      priority: number,
      metrics: { impressions:0, clicks:0, atc:0, revenue:0 },
      createdAt, updatedAt
    }
  },
  deals: { /* aggregated view of active deals for hub */ }
}
```

### 11.2 Curated Rails (First Deliverable)
MVP Scope:
1. Admin UI tab: “Rails” inside Marketing Manager
2. List view: rails filtered by status (Published/Drafts) + quick search by title
3. Editor panel (right side or modal):
   - Title
   - Type (taxonomy from list above – influences default query helpers later)
   - Placement selector (page + slot)
   - Items: simple SKU list input (comma or newline) with real‑time validation (placeholder resolution later)
   - Targeting & Schedule reuse existing components from Hero
   - Priority (affects ordering for same slot)
   - Status toggle / Duplicate / Delete
4. Metrics mini‑panel (local): impressions, CTR, ATC, revenue (all local for now).
5. Resolver logic: For a given page/slot retrieve all published, in‑window rails, sort by priority ascending, limit by slot capacity (e.g., 1 top rail, 2 mid rails, etc.).
6. Rendering component: `<Rail title items layout="grid|scroll" />` with optional sponsored label injection (placeholder hook).

Non‑Goals in MVP: automated best sellers query, trending algorithm, vendor self‑service, sponsored bidding UI.

### 11.3 Deals Hub
MVP (after rails baseline): Static `/deals` route pulling all products with an active discount OR in any rail tagged type=featured AND discount > X. Provide basic filters (category select, discount tier buckets).

### 11.4 Free‑Shipping Threshold Nudge
Cart component extension: read threshold (hardcoded config object keyed by region) and user subtotal; display progress bar & delta text. Local metrics: impressions + conversions (reached threshold event).

### 11.5 Sponsored Products (Limited)
Initially: Manual flag on rail items `reason:'sponsored'` plus label & simple per‑session cap (store a set in sessionStorage). Future: vendor request queue & pacing.

### 11.6 Abandoned Cart Email (Basic)
Prereq: simple job (frontend stub or backend endpoint) that stores cart snapshot + timestamp on unload if items exist and user not purchased. After X hours with no order event, send templated email (Admin editable template). Guard: 2 touches max per cartId.

## 12) Quick Start Checklists

### 12.1 Launch Curated Rails
1. Add Rails tab in Marketing Manager (reusing existing layout shell).
2. Implement marketingStore extension & load/save for `rails`.
3. Create RailsList component (filter + create new).
4. Create RailEditor (fields in 11.2).
5. Build resolver `resolveRails(pageContext)` returning ordered rails with slot capacity rules.
6. Insert `<RailsZone page="home" slot="below_hero" />` under hero on Home.
7. Add metrics hooks (impression on mount, click on product tile, ATC + revenue passthrough via existing cart add handler interception).
8. Local test (unit + integration) for resolver + metrics increments.
9. Manual QA: create multiple rails with priorities, verify ordering & caps.
10. Update this manual & README references.

### 12.2 Stand Up Deals Hub
1. Add route `/deals`.
2. Aggregate active deals (discount >0 or flagged) into a simple array.
3. Add category & discount tier filter UI (client-side).
4. Track visits + ATC from deals context.
5. Add navigation entry point (e.g., header link or micro‑banner).

### 12.3 Free‑Shipping Nudge
1. Define `FREE_SHIP_THRESHOLDS = { 'US': 50, 'UK': 45, ... }`.
2. Hook cart subtotal + region (fallback) to compute remaining delta.
3. Show progress bar + copy: "Spend $X more for free shipping".
4. Fire impression once; fire conversion when threshold crossed.

### 12.4 Sponsored Products (Initial)
1. Allow marking rail item as sponsored (UI checkbox per SKU row).
2. Session cap: track how many sponsored impressions per railId; hide beyond cap (configurable, default 1 per session).
3. Add visible label + aria-label "Sponsored product".
4. Metrics: separate sponsored impressions & clicks counters (namespaced).

### 12.5 Abandoned Cart Email (Basic)
1. On cart change, persist snapshot + timestamp (local or backend test endpoint).
2. Add lightweight inactivity check (e.g., service worker or scheduled backend job simulation) to detect no purchase after N hours.
3. Email template (subject, header, item list, CTA back to cart) stored in marketingStore.
4. Respect opt-out / unsubscribe placeholder.
5. Fire metrics: email sent, email clicked, recovered revenue.

## 13) Future Enhancements (Backlog Seeds)
Short list derived from Phases 2 & 3 for grooming:
* Auto-populate rails (best sellers, trending) via analytics queries.
* Vendor self-service deal submission & approval queue.
* Dynamic margin guard: highlight rails exceeding discount/COGS tolerance.
* A/B testing harness for rail title copy & placement.
* Central analytics adapter to send local metrics to backend pipeline.
* Loyalty points balance component & checkout redemption UI.
* Bundle builder UI with preview pricing simulation.
* PDP cross-sell rule engine (vector similarity + manual pinning).

---
This expanded roadmap section is living documentation. Update as capabilities evolve.
