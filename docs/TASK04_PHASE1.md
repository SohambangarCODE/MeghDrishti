# Task 04 Phase 1 — Graph continuity and map stability

## Files changed

- `frontend/src/pages/Graph.jsx`
- `frontend/src/services/graphView.js` (new, pure presentation helpers)
- `frontend/src/pages/Locations.jsx`
- `frontend/src/services/mapView.js` (new, pure presentation helpers)
- `frontend/src/tests/graphMapView.test.js` (new)
- `frontend/e2e/graph-map.spec.js` (new)
- `docs/TASK04_PHASE1.md` (this report)

No backend APIs, simulation calculations, datasets, saved snapshot contracts, authentication, migrations, RLS, providers or layout libraries changed. No Git operations performed. Phase 2 was not started.

## Graph continuity

The previous `filtered.slice(0, 40)` depended on dataset order, and both-endpoint edge filtering then removed relationships to companies outside that slice. A Locations target could be inspectable in text while absent from the canvas.

The new deterministic subset resolves the decoded `entity` parameter against exact IDs in the active graph. Empty/control-character, oversized, absent or ambiguous IDs receive an explicit notice. IDs are never coerced into numbers or inferred by prefix. A selected company is added first, followed by its incoming/outgoing recorded commercial neighbors, followed by at most enough unrelated filter matches to reach the normal limit of 40. Selected non-company entities retain their immediate operational/context neighbors. Node and edge IDs are deduplicated; original relationship direction is preserved. Edges between all visible nodes remain available, including between neighboring companies. Commodity context does not create extra commercial neighbors.

Direct company neighborhoods above 40 expand in full, with a notice, zoom controls and a readable entity/relationship alternative. The existing `layoutGraph` is unchanged. Selected nodes receive the existing selection border; direct commercial arrows receive thicker orange styling, explained in the legend. React Flow fits the selected entity and its neighborhood after selection; the larger neighborhood supports a lower minimum zoom. URL changes clear prior inspector selection. Path selection removes the entity URL focus so existing path filtering can take precedence.

Partial/pagination source metadata and dangling relationship endpoints receive an explicit upstream limitation notice. Every graph also states that real-world relationship completeness is unknown. This implementation displays records supplied in the source; it does not fetch missing upstream pages or assert complete supplier coverage.

## Map lifecycle and viewport

The previous effect recreated the map/tile layer whenever selection, company or filters changed. Initialization now happens lazily on the first "Load online map tiles" click. The container stays mounted, including when hidden for the offline list. Instance and facility/route/weather layer groups stay in refs. Selection/filter changes clear and rebuild only the respective geometry layers. The one map click listener uses current action refs; no selection-dependent listeners are accumulated. `map.remove()` occurs only in component-unmount cleanup, including StrictMode cleanup. Returning online invalidates the map size without rebuilding it. Dataset/private-report context changes still deliberately remount the scoped component.

Viewport bounds are compared by coordinate extents and explicit selection, not by array identity. Equivalent bounds do not trigger another fit, preserving manual zoom/pan when unrelated state changes. Facility selection focuses that site; company selection fits its displayed footprint; route selection fits its valid supplied geometry. Zero points cause no fit, one point uses a capped zoom, and multiple points use padded bounds with a maximum zoom. Weather points retain their own independent layer and explicit focus behavior. Tooltips are safely built from text and reattached to current source records; there are no persistent popups to migrate.

All selected-company facility records are rendered in the list and all valid coordinates plotted. The unfiltered global map/list uses an explicitly reported 50-site limit. Missing/invalid coordinates and malformed geometry remain unplotted rather than fabricated.

## Geometry evidence rules

Classification reuses Task 03 `isSynthetic`, bounded coordinate/LineString validation and `evidenceRules` claim checks. Synthetic or explicitly assumed geometry uses reduced-opacity dashed lines and hollow facility markers. Claim-supported sourced geometry uses solid lines and filled site markers. Unknown evidence uses dotted neutral geometry and partly filled markers. A generic source URL is insufficient. Selection colors preserve the evidence dash/fill patterns. The accessible text legend explains these non-color distinctions and that sourced is not independent verification. Endpoint markers remain explicitly identified as geometry-order annotations.

## Historical privacy

Existing AppState ownership/session guards and source selection are preserved. Graph reads an active private run's immutable `sourceSnapshot`; Locations and its evidence index do the same. Missing historical sources remain unavailable. No new network calls, caches or browser persistence were added for graph/map records. Existing historical weather-refresh restrictions remain in place. Context keys and protected-route unmounts clear private selections on logout/account changes. Existing browser tests exercise source separation, zero public coverage requests while private evidence is active, absence of private records from localStorage, and logout/account isolation.

## Verification

- `npm run test --workspace frontend`: **58 passed**, 8 files, including 8 new pure graph/map tests.
- `npm run test:e2e --workspace frontend -- e2e/graph-map.spec.js e2e/routes.spec.js e2e/entity-evidence.spec.js`: **18 passed**, 47.2 seconds (desktop and mobile).
- `npm run test:e2e --workspace frontend`: **90 passed**, 3.8 minutes, 45 desktop and 45 mobile checks, no failures or retries.
- `npm run build --workspace frontend`: **passed**, 980 modules, 18.46 seconds. Existing Zod annotation and >500 kB chunk warnings remain.
- Backend contracts: not rerun because no backend/API code changed.

The new browser tests cover an entity beyond the original 40, exact URL selection and invalid/missing IDs, highlighted directed links, a 63-entity expanded neighborhood with pagination disclosure, 65 selected-company facilities, stable Leaflet container identity across company/offline changes, a single zoom control, replacement layer counts, unchanged viewport on equivalent geography, and claim-specific sourced/synthetic/unknown SVG styles. Screenshots are generated in `artifacts/playwright`.

Early verification caught a leftover cleanup syntax error and an invalid test-only share total, both corrected before acceptance checks. Subsequent test fixes corrected a label locator and the expected drawable geometry count (the fixture contains an unlocated facility). Privacy assertions were not weakened.

## Limitations

Large direct neighborhoods and selected-company facility lists expand without clustering or pagination; very large future datasets may require explicit pagination/virtualization. Existing layered layout remains and may have overlapping links in dense/cyclic graphs. Source completeness is unknown unless more authoritative data is supplied; pagination is disclosed, not automatically followed. Tile availability requires external network access, with the existing offline fallback preserved. Fixtures used to verify sourced styles are test evidence, not newly verified real operating locations. Live Supabase verification and provider integrations are outside this phase.
