# Rail Metrics & Recommendations

This document explains how rail-level merchandising metrics are tracked, aggregated, audited, and translated into recommendations / guardrail reasoning.

## 1. Data Models (Backend)

- `Rail` – Core configuration (title, status, priority, placement, items[] with reasons like `sponsored`).
- `RailMetricsDaily` – Per (railId, UTC date) roll-up of raw counters:
  - Primitive counters: `imp`, `clk`, `atc`, `rev`, `sessions`
  - Suppression breakdown (guardrails):
    - `suppression.sponsored` – Per-rail sponsored impression cap enforcements
    - `suppression.siteSponsored` – Site-wide sponsored cap enforcements
    - `suppression.capacityTrim` – Generic trim (capacity pressure)
    - `suppression.capacityRail` – Rail-local capacity trimming
  - Item interaction maps (optional):
    - `item.clkItems.{sku}` / `item.atcItems.{sku}`
- `RailSessionSeenDaily` – Uniqueness ledger ensuring each (sessionId, railId, date) contributes **at most one** session increment.

## 2. Session Uniqueness

A cookie `railSessId` is lazily set on first metrics flush. During `/api/rails/metrics/flush`:
1. All `imp` events collect candidate railIds into `sessionRails`.
2. For each rail in `sessionRails`, an upsert against `RailSessionSeenDaily` is attempted:
   - If the document did **not** exist (first view this session/day) `sessions` counter for that rail/day is incremented.
   - If it existed, no increment occurs.
3. The audit record (action = `metrics_flush`) includes a diff summary with `sessions` reflecting how many unique rails just incremented.

> TTL (planned): Provide an index to expire `RailSessionSeenDaily` docs after 60–90 days to curb growth.

## 3. Metrics Flush Payload
```
POST /api/rails/metrics/flush
{
  "events": [
    { "railId": "rail_x", "type": "imp", "count": 3 },
    { "railId": "rail_x", "type": "clk", "count": 1 },
    { "railId": "rail_x", "type": "atc", "count": 1, "rev": 25.50 },
    { "railId": "rail_x", "type": "suppression", "subtype": "sponsored", "count": 2 }
  ]
}
```
Supported event types:
- `imp`, `clk`, `atc` (+ optional `rev` value piggybacked on atc)
- `suppression` with `subtype` in `sponsored|siteSponsored|capacityTrim|capacityRail`
- `item` with `subtype` `clk|atc` and `sku`

## 4. Aggregation & Derived KPIs
`GET /api/admin/rails/metrics?window=7&baseline=28` performs:
- Window slice: last N days (`window`), plus a broader baseline horizon (`baseline` days) for percentile computation.
- Derived per rail:
  - `ctr` = clk / imp
  - `atcRate` = atc / clk (guarded for zero)
  - `revPerImp` = rev / imp
  - `rpm` = rev per 1000 impressions (revPerImp * 1000)
  - `revPerSession` = rev / sessions
  - `deltas` vs p50 baseline: `ctrDeltaPp`, `atcDeltaPp` (percentage points)

### Baseline Percentiles
Two layers are now provided:

1. Global baseline (across all rails over the baseline horizon):
  - CTR: p30, p50, p70
  - ATC Rate: p30, p50, p70
  - RPM: p80 (upper-tail performance marker)
  - 7-day subset: parallel CTR & ATC percentiles for short-term drift detection
2. Per-rail baseline (historical distribution for each rail individually over the same horizon):
  - `perRailBaseline.sampleDays` – number of days that contributed CTR samples (days with impressions)
  - `perRailBaseline.ctr.{p30,p50,p70}`
  - `perRailBaseline.atc.{p30,p50,p70}`
  - `perRailBaseline.rpm.p80`

These per-rail baselines allow comparing current window performance both to fleet-wide norms (global) and the rail's own historical central tendency.

## 5. Recommendations & Reasons
A reasons array is attached to each rail along with a single `recommendation` enum:

| Reason | Meaning |
|--------|---------|
| LOW_CTR | CTR below p30 baseline |
| LOW_ATC | ATC rate below p30 baseline |
| HIGH_RPM | RPM >= p80 baseline (strong monetization) |
| CAP_PER_RAIL | Sponsored suppression at per-rail cap present |
| CAP_SITE | Sponsored suppression at site-wide cap present |
| SUPPRESSION_HIGH | Combined sponsored + siteSponsored suppression is heavy (>= max(3, 50% of imps)) |

Recommendation priority logic (first matching wins):
1. CAP_PER_RAIL + CAP_SITE ⇒ `SPONSORED_CAP_MULTI`
2. CAP_PER_RAIL ⇒ `SPONSORED_CAP_PER_RAIL`
3. CAP_SITE ⇒ `SPONSORED_CAP_SITE`
4. SUPPRESSION_HIGH ⇒ `SPONSORED_CAP_HIT`
5. LOW_CTR + LOW_ATC ⇒ `ROTATE_CONTENT`
6. HIGH_RPM ⇒ `BOOST_PLACEMENT`
7. (default) ⇒ `KEEP`

## 6. Preflight Validation
`POST /api/admin/rails/preflight`
- Inputs: `items[]`, `capacity` (caps), optional `requireTargeting`, `failOnWarnings`.
- Derives `sponsored` count and checks:
  - Min/max items, per-rail sponsored cap, site sponsored cap.
  - Targeting presence if required.
- Responds with `{ ok, counts, capacity, expected, warnings[], reasons[] }`.
  - `ok` flips to false when `failOnWarnings=true` and warnings exist.
  - `expected` contains heuristic CTR & ATC rate ranges derived from global aggregates (fallback defaults if sparse).

## 7. Audit Logging
Audit file: `uploads/rails-audit.log.jsonl`
Entries for:
- `create`, `update`, `delete` on rails (with snapshot metadata)
- `metrics_flush` with summarized diff:
  - `imp, clk, atc, rev, suppression, sessions, rails`
  - `sessionId` for correlation (facilitates session uniqueness validation tests)

### Session Increment Audit Semantics
Each flush that increments at least one new `(rail, session)` pair reports the count of *new* session increments (`sessions` field). A second flush with the same cookie and only repeated rails will show `sessions:0`.

## 8. Guardrail Philosophy
The system favors transparency over silent tuning. Reasons are additive—multiple suppression causes can coexist. Recommendations distill these into a single action message to reduce dashboard noise while still exposing root causes.

## 9. Planned Enhancements
- TTL index & duplicate key resilience for `RailSessionSeenDaily` to bound storage. (TTL implemented; duplicate key handled.)
- Multi-window per-rail baselines (e.g., separate 7-day vs 28-day personal percentiles) for trend acceleration detection.
- Optional anomaly flags (e.g., sudden CTR plunge beyond z-score).

## 10. Troubleshooting / Edge Cases
| Scenario | Behavior |
|----------|----------|
| No impressions during window | Derived rates default to 0; reasons only suppression-based if applicable |
| High revenue but low clicks | Might show HIGH_RPM without LOW_CTR/LOW_ATC triggers (BOOST_PLACEMENT) |
| Flush with only suppression events | No session increment (needs an imp) |
| Duplicate session flush same day | No additional sessions increment; audit shows sessions 0 |

---
**Last Updated:** 2025-09-24
