# Rails Selection Runbook

This runbook explains how presets, caps, conflicts, alerts, and operator knobs work for the Rails selection engine.

## Operator Knobs (backend/models/RailConfig.js)
- enabled: master enable for selection (default true)
- killSwitch: hard off; when true selection returns empty with ok=false
- selection.maxRails: max rails to return per surface
- selection.surfaces.<surface>.placements: allowed placements per surface (e.g., home: HeroTop, HeroBelow, Mid)
- weights.priority: weight multiplier for rail.priority
- weights.recencyMsDivisor: divisor to scale updatedAt timestamp into score
- floors.heroImpMin7d: minimum 7-day impressions for HeroTop rails
- floors.rpmQuantileMin: RPM quantile cutoff (e.g., 25 = bottom quartile filtered)
- caps.siteSponsoredCap / caps.perRailSponsoredCap: used by preflight and metrics badges
- alerts.selectionLatencyMs: threshold for selection latency alerts
- alerts.staleRollupDays: max allowed age of latest rollup

## Endpoints
- GET /api/admin/rails/config — view config
- PUT /api/admin/rails/config — update config (JSON body)
- GET /api/admin/rails/selection — admin selection with decision logs (requires RAILS_SELECTION_V1=true)
- GET /api/rails/selection — public selection for frontend (guarded by flag and kill switch)
- GET /api/admin/rails/metrics — detailed per-rail metrics with baselines and conflict badges
- GET /api/admin/rails/metrics/summary — site-level summary
- GET /api/admin/rails/sov — share-of-voice by owner/tactic
- GET /api/admin/rails/alerts — operational alerts (stale rollups, empty selection, slow selection, cap site high)
- POST /api/admin/rails/backfill — ensure 28-120d metrics docs exist for active rails

## One-per-Category Enforcement
- CategoryTop uniqueness enforced on save for Prod/Active per category.
- Also enforced in selection to prevent duplicates on a page.

## Item Deduplication
- Selection dedupes items across picked rails by SKU. Suppressed items counted in decision logs.

## Quality Floors
- HeroTop requires heroImpMin7d impressions (7-day aggregate) by default.
- RPM bottom quartile cutoff enforced using recent RPM distribution per selection call.

## Kill Switch
- Set killSwitch=true in config or env RAILS_SELECTION_DISABLE=true to immediately disable selection.

## Runbook Actions
- Update config: PUT /api/admin/rails/config with partial JSON. Example:
  {
    "selection": { "maxRails": 6 },
    "floors": { "heroImpMin7d": 200 },
    "alerts": { "selectionLatencyMs": 300 }
  }
- Backfill baselines: POST /api/admin/rails/backfill { "window": 28 }
- Investigate alerts: GET /api/admin/rails/alerts, then drill via metrics endpoints.

## Notes
- Baselines and quantiles are computed over available rollups. Ensure backfill runs at least once.
- SoV is computed over the selected window by joining rail metadata on rollups.
