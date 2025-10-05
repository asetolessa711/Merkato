# Merkato — Rails Registry & Operations Guide (Mongo + React)

Last updated: September 25, 2025

Purpose
- Provide a developer- and admin-friendly reference to define rails, link them to marketing tactics, and run day-to-day operations. This guide ensures the metrics you see on the Rails Metrics dashboard map cleanly to tactics and ownership (Admin vs Vendor).

How to Use this Guide
1. Start with the Rails Registry fields and naming rules.
2. Create rails per tactic and placement using the examples provided.
3. Use the Admin & Vendor Workspaces to raise, approve, and monitor rails.
4. Use the KPIs maps to interpret results and decide promote/rotate/suppress actions.

## Rails Registry — Required Fields
- railId (canonical, stable): e.g., deals.hero.flash_deals
- displayName (admin-facing): e.g., “Flash Deals”
- tactic: Curated | DealsHub | CategoryPromo | BrandSpotlight | CrossSell | Collection | Sponsored
- category: Discovery | Deals/Promo | Sponsored | Session-Based | Editorial/Brand | Audit/Test
- placementKey: Hero | Mid | CategoryTop | DealsPage | PDP | Cart | CollectionPage | SearchResults
- environment: Prod | Staging | Dev
- opsStatus: Active | Paused | Archived
- owner: Marketing / System+Marketing / Vendor (requester)
- variant (optional): A/B tag (A, B, Layout-2)
- badges (diagnostics): SPONSORED, CAP_SITE, CAP_PER_RAIL, CAP_MULTI
- notes: rationale, eligibility, copy/creative notes
- campaignId (optional): campaign bucket (e.g., eid_2026_wk1)
- inventoryAware (bool): respects stock/region
- eligibilityRules: succinct rules for inclusion
- capSitePct / capPerRailPct (Sponsored only)
- createdAt / lastUpdated

### Naming Rules
- Format: category.placement.short_name (lowercase; underscores allowed).
- Major changes to category/placement/sponsored → create a NEW railId; archive the old to preserve analytics continuity.

### Example Canonical Rails
| railId | displayName | tactic | placementKey | environment | owner |
|---|---|---|---|---|---|
| discovery.hero.featured | Featured | Curated | Hero | Prod | Marketing |
| discovery.mid.trending | Trending | Curated | Mid | Prod | Marketing |
| deals.page.percent_off_30 | 30% Off | DealsHub | DealsPage | Prod | Marketing |
| promo.cat_top.kitchen_30_off | Kitchen 30% Off | CategoryPromo | CategoryTop | Prod | Marketing |
| brand.hero.spotlight_acme | Brand Spotlight: ACME | BrandSpotlight | Hero | Prod | Marketing |
| pdp.similar_items | Similar Items | CrossSell | PDP | Prod | System+Marketing |
| cart.more_from_brand | More from Brand | CrossSell | Cart | Prod | System+Marketing |
| collection.mid.eid_gifts | Eid Gifts | Collection | CollectionPage | Prod | Marketing |
| sponsored.mid.fashion | Sponsored Fashion | Sponsored | Mid | Prod | Marketing |

## Metrics Dictionary (linked to Rails)
- Impressions — Unique(sessionId, railId, dateUtc); server-derived UTC date.
- Clicks — Total clicks inside the rail; itemId optional for top items.
- CTR % — Clicks / Impressions × 100.
- ATC — Add-to-Cart events attributed to last-touch from rail (24h window, tunable).
- ATC Rate % — ATC / Clicks × 100 (post-click intent).
- Revenue — Sum(order revenue) attributed to rail clicks (policy aligned with Finance).
- RPM — Revenue / Impressions × 1000 (primary revenue density KPI).
- Attach Rate — (CrossSell) add-on orders / eligible orders × 100.
- AOV Lift — AOV_with_rail − AOV_baseline (weekly; baseline = prior 28d).
- ROAS — (Sponsored) Revenue / AdSpend.
- Share of Voice — (Sponsored) Sponsored Impressions / Total Impressions × 100.

## Tactics → Primary KPIs (how to read results)
| Tactic | Primary KPIs | Operational Notes |
|---|---|---|
| Curated | Impressions, CTR %, ATC, RPM | Rotate weekly; promote high RPM; fix creative if CTR low. |
| DealsHub | Sessions (page), CTR %, ATC, Revenue share | Watch cannibalization; keep hub fresh; test tiers. |
| CategoryPromo | Category CTR %, ATC delta | Exactly 1 per category; compare vs control weeks. |
| BrandSpotlight | Brand page CTR, ATC | Limit to 1–2 on Home; refresh assets if CTR drops. |
| CrossSell | Attach Rate, AOV Lift | One row on PDP and Cart; tasteful; pin overrides sparingly. |
| Collection | Page CTR, Conversion vs baseline | Time-boxed campaigns; campaignId required. |
| Sponsored | CTR %, ROAS, Ad Revenue | Respect caps; watch organic RPM impact; label Sponsored. |

## Admin Workspace — Actions & Decisions
- Views to use: Curated, Deals, Brand, Cross-sell, Collections, Sponsored (saved filters).
- Daily: sort by RPM, scan CTR and ATC Rate; promote 1–2 rails; log actions.
- Weekly: compare 7d vs 28d baseline; rotate bottom-quartile RPM rails; review Sponsored caps & ROAS.

### Admin Action Types (examples)
- Promote: move rail up/expand placement.
- Rotate: swap creative/titles/hero imagery; retire low performers.
- Fix PDP: address post-click friction (variants, shipping transparency, speed).
- Adjust Caps (Sponsored): tweak site/rail share within policy.
- Archive: retire railId (create new for major changes).

## Vendor Workspace — Requests & Monitoring
- Vendors can submit: Sponsored slot requests (budget, CPC), Deals proposals (discount tiers), Bundles/Kits.
- Each request targets a rail (railTarget) or a hub (Deals page rails).
- Expected KPIs must be declared (e.g., CTR ≥2%, ROAS ≥3.0, ATC +15%).
- Admin reviews/approves; decisions recorded with effective dates; monitor via KPIs.

## Saved Views & Alerts
- Saved views (filters) align with tactics; they keep the 7 KPIs but change context.
- Recommended alerts: CTR drop > 2pp vs 28d (2 days), ATC Rate drop > 5pp, RPM bottom quartile (3 days, volume floor), Sponsored caps violations.

## Glossary
- pp (percentage points): absolute percentage difference (e.g., 8%→5% = -3 pp).
- Baseline: longer comparison window (e.g., 28d).
- RPM: revenue per thousand impressions (density metric).
- Last-touch: simplest attribution tying the rail to purchase within a time window.

---
For the Excel workbook version with prebuilt tabs (Registry, Metrics, Tactics, Admin & Vendor Workspaces), use the companion file: “Merkato_Rails_Registry_Workbook.xlsx”.
