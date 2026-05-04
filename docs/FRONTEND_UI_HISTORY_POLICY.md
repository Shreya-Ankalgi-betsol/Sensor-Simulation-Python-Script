# Frontend UI History and Caching Policy

Date: 2026-04-23
Scope: Desktop threat-detection operator app

## 1) Goals

- Keep UI responsive under large history volumes.
- Avoid loading full threat history into frontend memory.
- Make recent/live threats feel real-time.
- Keep backend as source of truth for historical data.

## 2) Hard Rules

1. Never fetch or render the full threat table in the client.
2. History is always server-filtered and cursor-paginated.
3. Default history window must be bounded (not "all time").
4. Frontend keeps only a bounded number of pages in memory.
5. Export of large datasets must be asynchronous backend job.

## 3) Recommended Limits (Initial Baseline)

Use these values as v1 defaults:

- Threat page size: 100 rows.
- Max buffered pages in memory per query key: 10.
- Max history rows in memory per query key: 1000 rows.
- Max distinct cached query keys: 8.
- Live stream in-memory ring buffer: 300 events.
- Realtime list render cap (if not virtualized): 200 rows.
- Virtualized table target: enabled for history table.

This keeps memory bounded and avoids React render slowdowns.

## 4) Query Key Model

Cache key should include:

- from_dt, to_dt
- sensor_type
- sensor_id
- severity
- threat_type
- page_size

Example key shape:

- threats:{from}:{to}:{sensor_type}:{sensor_id}:{severity}:{threat_type}:{page_size}

## 5) Cache TTL and Freshness Policy

- staleTime: 15 seconds for history queries.
- cacheTime (gcTime): 5 minutes for inactive query keys.
- Refetch on window focus: disabled for history tab.
- Refetch on reconnect: enabled.
- Manual refresh button: always available.

Rationale:
- Short staleTime keeps operator view fresh.
- 5-minute cache avoids refetch churn when switching filters/tabs.

## 6) Eviction Policy

Use LRU at two layers:

1. Query-key level
- Keep up to 8 distinct keys.
- Evict least recently used key when limit exceeded.

2. Page level per key
- Keep latest 10 pages.
- On page 11+, drop oldest page(s).

Result:
- Memory remains predictable even under extensive filter exploration.

## 7) Time Window Defaults

Recommended defaults for history tab:

- Default: last 24 hours.
- Quick presets: 15m, 1h, 6h, 24h, 7d.
- Custom range allowed up to 30d in interactive UI.
- For >30d, require export flow or dedicated archive query mode.

## 8) API Interaction Contract

The frontend should expect:

- items[]
- next_cursor
- has_more
- optional summary fields (counts/cards)

Frontend behavior:

- Initial load: request first page for default time range.
- Scroll/load-more: request using next_cursor.
- Stop when has_more is false.
- Do not issue "count all" on every interaction.

## 9) Rendering Performance Rules

1. Use row virtualization for history table.
2. Avoid heavy per-row computation during render.
3. Pre-format timestamps on ingest into view model.
4. Memoize row components and column definitions.
5. Keep row height fixed where possible for cheaper virtualization.

## 10) Slow Query UX Standard

If query takes >500 ms:

- Show skeleton rows immediately.
- Keep previous page visible when safe.
- Show small loading state near table footer/header.

If query takes >2 s:

- Show "Large range selected" guidance.
- Suggest narrowing time range or filters.

If query fails:

- Keep last successful data in view.
- Show retry action and failure reason.

## 11) Live + History Data Separation

Keep two stores:

1. Live store
- Source: websocket/threat push.
- Max 300 events (ring buffer).
- Purpose: awareness and recent activity.

2. History store
- Source: paginated REST queries.
- Bounded pages/rows per key.
- Purpose: investigation and audit browsing.

Do not merge full history into live store.

## 12) Memory Budget (Desktop Target)

UI-side threat data target budget:

- Soft limit: 20 MB for threat-list related client memory.
- Hard limit: 40 MB.

Approximation:

- If average hydrated row object is ~1.5 KB,
- 1000 rows ~= 1.5 MB per active key.
- With 8 keys, worst case ~= 12 MB (+ framework overhead).

This is safe for desktop while leaving headroom for maps/charts.

## 13) Implementation Checklist

1. Enforce default time range at initial mount.
2. Enforce max 30d interactive range in UI controls.
3. Add/confirm virtualized table in threat logs tab.
4. Limit buffered pages per key to 10.
5. Limit distinct query keys to 8 using LRU.
6. Separate live ring buffer from history query cache.
7. Keep page size at 100 (re-evaluate after profiling).
8. Add performance telemetry (p95 fetch and render times).

## 14) KPI Targets

- History initial load p95: <= 1.2 s (24h range, default filters).
- Load-more p95: <= 700 ms.
- UI frame drops during scroll: minimal/no visible jank.
- Browser/Electron memory growth: stable over 60-minute session.

## 15) Re-tuning Triggers

Revisit these numbers if any of the following occur:

- Sensors/event rate grows >2x.
- p95 load-more >1 s for 3 consecutive days.
- UI memory exceeds hard limit during normal operations.
- Operators require routine interactive analysis beyond 30 days.

## 16) Recommended Next Step

Run a one-day profiling pass with simulated production traffic and measure:

- p50/p95 API latency by range/filter set.
- Render time for 100, 500, 1000 row buffers.
- Memory footprint with 1, 4, and 8 cached query keys.

Then adjust page_size, staleTime, and max pages using measured data.
