# Merkato Rails Metrics — Admin Guide (Mongo + React)

Last updated: September 25, 2025

## Purpose

This guide helps admins and merch/marketing teammates quickly read the Rails Metrics dashboard, decide what to do (promote, fix, rotate, or suppress), and maintain data quality.

## How to Use the Dashboard

1. Choose a window: Today, 7d (default), or 28d.
2. Review the Overview table with the 7 Core KPIs per rail (one row per unique railId).
3. If alerts appear, address them first. If alerts are not yet enabled, use the thresholds below as a manual checklist.
4. Optionally open Trends for baselines and deltas, or open Diagnostics for deeper investigation.

Implementation notes (v1):
- Overview shows only the 7 KPIs for focus.
- Auto‑refresh is visible and active only for Today. 7d/28d show a static “Last updated” timestamp. Auto‑refresh uses a jittered interval (about 60–120s) to avoid thundering herds.
- Trends & Diagnostics are collapsible drawers (progressive disclosure).
- Duplicate rails are de‑duplicated by railId to keep the tables crisp.

## Core KPIs (Overview)

Each row shows one rail over the selected window.

- Impressions — Unique views per day (unique per (railId, sessionId, UTC date)).
- Clicks — Total clicks on items inside the rail.
- CTR % — Click‑through rate: Clicks ÷ Impressions × 100.
- ATC — Add‑to‑Cart events that originated from this rail’s clicks.
- ATC Rate % — ATC ÷ Clicks × 100 (post‑click intent).
- Revenue — Gross revenue attributed to this rail within the window (simple last‑touch).
- RPM — Revenue per thousand impressions: Revenue ÷ Impressions × 1000.

Why these 7? Together they tell you: seen → interested → intent → money. They’re stable across rails and easy to compare—enough to decide “boost / rotate / fix creative / suppress.”

Quick RPM example
- If a rail generates $42 in revenue over 1,000 impressions, RPM = 42 / 1000 × 1000 = 42.00.

## Views (Progressive Disclosure)

- Overview (default) — the 7 KPIs only. Auto‑refresh is on only for Today.
- Trends (optional) — baseline deltas like CTR Δ (vs 28d) and ATC Δ, plus global percentiles (e.g., CTR p50, RPM p80). Sparklines can be added later.
- Diagnostics (drill‑down) — Sessions/Reach, suppression/cap reasons, recommendations; placement/device/audience splits are shown when available or during investigations.

## How to Interpret (Decision Playbook)

Visibility
- Low Impressions but healthy CTR/RPM — increase exposure (raise position, larger tiles).
- High Impressions but weak CTR — fix creative/layout (thumbnails, titles, price cues) before boosting.

Quality vs. Friction
- CTR down, ATC Rate normal — click intent issue (creative/offer). Refresh creative.
- CTR normal, ATC Rate down — post‑click friction (PDP variants, shipping surprises, slow page). Fix PDP.

Money Density (RPM)
- Low RPM with decent CTR — check ATC Rate, fees, shipping transparency.
- High RPM with low CTR — keep the rail; it's efficient but not broad. Avoid overexposure.

## Alerts (When the system flags issues)

Suggested thresholds (tune after 2–3 weeks of data):
- CTR drop > 2.0 percentage points vs 28‑day baseline for two consecutive days.
- ATC Rate drop > 5 percentage points with CTR stable (likely PDP/friction).
- RPM in bottom quartile for three days AND impressions above a floor (e.g., 200/day).
- Suppression/cap applied to > 20% of eligible impressions (revisit caps/eligibility).

Note: Rule‑based alerts are planned; in the current build, use these thresholds as a manual review guide.

## Data Hygiene (Keep numbers trustworthy)

- Always derive UTC date server‑side; do not rely on client clock.
- Filter obvious bots; flag bursty sessions; re‑aggregate nightly.
- Use a simple last‑touch attribution window (e.g., within 24h of rail click).
- Retain raw events 90–180 days; keep rollups indefinitely.

## Daily & Weekly Workflow

Daily (5–10 min)
- Open Overview (7d). Sort by RPM; scan CTR and ATC Rate.
- Review and act on alerts (or apply the thresholds above).
- Promote 1–2 high‑RPM rails; log 1–2 creative/PDP fixes.

Weekly (30 min)
- Compare 7d vs 28d baselines (Trends).
- Review bottom‑quartile RPM rails for rotation/suppression.
- Check Diagnostics for frequent caps/suppressions; adjust policies if quality is good.
- Record top 3 actions and evaluate impact next week.

## Glossary

- Percentage point (pp) — absolute difference in percentage values (e.g., 8% to 5% is −3 pp).
- Baseline — a longer window (28d) used to compare trends.
- RPM — revenue per thousand impressions; a handy one‑number revenue density.

## Roadmap to AI‑Managed Mode

- Phase 1: Rule‑based alerts (thresholds above).
- Phase 2: AI hints per rail (“promote / refresh creative / fix PDP” with short rationale).
- Phase 3: Closed‑loop testing — AI proposes small layout/creative tweaks; humans approve; results feed back into recommendations.

## Appendix (Attribution & Volume Notes)

- Treat rails with very low impressions as noisy; avoid acting until the rail surpasses a minimum daily volume (e.g., 200 impressions).
- When comparing rails, keep placement/device/audience in mind; use Diagnostics for fair comparisons.

---

Alignment to current implementation:
- Core KPIs and Today‑only auto‑refresh are implemented.
- Trends exposes deltas vs baseline and global percentiles; sparklines and automated alerts are roadmap items.
- Diagnostics shows sessions, recommendations, reasons, and suppression totals; dimension splits surface when the backend provides them.
- Duplicate rails are de‑duplicated in the UI by railId.
