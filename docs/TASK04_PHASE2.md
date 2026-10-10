# Task 04 Phase 2 — Graph readability, paths and modeled hazard targets

## A. Modified files

- `frontend/src/pages/Graph.jsx`
- `frontend/src/services/graph.js`
- `frontend/src/services/graphView.js`
- `frontend/src/pages/Locations.jsx`
- `frontend/src/services/hazards.js` (new)
- `frontend/src/tests/graphHazards.test.js` (new)
- `frontend/src/tests/graphMapView.test.js` (one obsolete path-isolation assertion updated for the required retained-background behavior)
- `frontend/e2e/graph-hazards.spec.js` (new)
- `docs/TASK04_PHASE2.md` (this report)

Build output and Playwright screenshots/traces are generated artifacts. No simulation formulas, normalized/raw datasets, dependency weights, navigation URLs, saved contracts, Supabase APIs/authentication/RLS/migrations, provider integrations or dependencies changed. No Git operations performed. Task 05 was not started.

## B. Graph layout and dragging

The existing commercial-depth/kind layers remain. Horizontal spacing is now 340 px for existing 220 px cards. Within layers, nodes have stable ID ordering, height-aware vertical spacing and 48 px of separation; layers are centered by their total height. Conservative estimates for wrapped labels/metrics are supplemented by measured React Flow heights. No new layout engine or artificial geographic information is used. Lightweight horizontal staggering was not necessary to solve card overlap.

Cards can be dragged. The controlled React Flow preserves measured dimensions and dragged positions, and connected edges update with movement. Removing the old selection-dependent React Flow key prevents remounts during selection. Manual positions are held in component memory by node ID and survive node selection, path selection/clearing and ordinary filters while the component stays mounted. Dataset/run context changes reset these positions; private context changes and logout unmount/clear them. Navigation away and back also starts a fresh view; no layout storage was introduced.

Selected-entity fitting is retained using the live React Flow instance and exact focused neighborhood. Position-only drag updates do not trigger another fit. Phase 1 exact-ID resolution, directed neighbors, deduplication, expanded company neighborhoods and upstream limitation notices remain covered by the original tests.

## C. Path highlighting

Selecting a strongest/alternative path prioritizes its companies and immediate commercial neighborhood while retaining compatible background filter matches. Existing selected-node inspection and filter controls remain. Relevant path nodes use an outlined warm fill, and exact directed path edges use thicker orange strokes. Unrelated nodes and edges remain in the view with reduced opacity rather than being removed solely because a path was selected.

Highlighting requires a stable path edge ID and matching adjacent supplier/customer IDs. Parallel relationships with the same endpoints are not highlighted unless their own ID is selected; reversed endpoints are not guessed into the path. Clearing the path restores normal styles and the current ordinary filtered view. Path ranking, stress and commercial-hop mathematics are unchanged.

## D. Hazard geometry sources and rendering

Locations has an opt-in Hazards toggle and modeled-event selector. Installed-data views use the current scenario's selected stored events and explicit intensity overrides without modifying source records. Historical private views use only `run.eventSnapshot` for modeled events, including its applied intensity/basis, and only `run.sourceSnapshot.regions` for geography. No current-event fallback occurs for incomplete saved events.

The Region schema's `boundary` permits unknown JSON, so the rendering adapter explicitly supports bounded longitude/latitude GeoJSON Polygon and MultiPolygon coordinates, including a Feature wrapping those geometries. Rings must be closed and have at least four valid coordinates. Unsupported boundaries and invalid coordinates are not treated as footprints. A valid supplied centroid is interpreted as `[longitude, latitude]` and rendered as a plus point marker; no circular distance/radius or extent is inferred. Records without usable boundary or centroid receive a geometry-unavailable notice. Duplicate target IDs are deduplicated; ambiguous/missing regions and dataset-version mismatch remain unavailable.

Boundaries use dashed low-opacity fill in a dedicated Leaflet pane below facility and route layers. Tooltips and offline descriptions include the modeled event ID, hazard type, intensity, basis, event provenance, geography provenance and geography level. The inline legend distinguishes modeled target boundaries and centroid points from sourced/observed hazard footprints. Even a sourced region boundary is not described as an observed storm/flood footprint. Synthetic, assumed, dataset-reported, sourced, unknown and unavailable labels are retained.

The hazard layer group uses the Phase 1 map instance. Toggle/event changes clear obsolete hazard layers and create current ones; company/route filtering cannot accumulate overlays. No hazard effect calls fitBounds/setView, so toggling does not override the map viewport. Unmount cleanup removes the map and all layer-group refs. Map IDs and viewport transforms are checked in the browser.

## E. Immutable historical integrity

No new network calls or persistent caches are used by these helpers. Private source/events are never uploaded to public coverage endpoints or written to localStorage. No results are changed or saved by graph dragging or hazard display. Existing owner/session guards and historical weather-refresh restrictions are unchanged. Browser tests reopen a private run while a different installed dataset is selected, verify saved intensity `0.37` and the private original region, assert no public coverage requests/private localStorage records, then verify logout clears the overlay state and source labels. Existing account-change/expiry/private-response regressions are included in the full suite.

## F. Verification

- `npm run test --workspace frontend`: **66 passed**, 9 files (8 new Phase 2 tests).
- `npm run test:e2e --workspace frontend -- e2e/graph-hazards.spec.js e2e/graph-map.spec.js e2e/workflow.spec.js`: **24 passed**, 1.1 minutes, desktop and mobile.
- `npm run test:e2e --workspace frontend`: **96 passed**, 4.1 minutes, 48 desktop and 48 mobile, no failures or retries.
- `npm run build --workspace frontend`: **passed**, 981 modules, 8.48 seconds. Existing Zod annotation and >500 kB bundle warnings remain.
- Backend tests were not rerun because backend/API code did not change; existing browser calculation workflows and frontend reference tests passed.

Early browser verification found the missing controlled-node dimensions handling, which was corrected. Test setup also needed complete stored-run metadata from the existing BrowserSimulationService, one SVG path per MultiPolygon rather than one per polygon, both selected scenario events for the event-switching fixture, and waits for dataset selection/private reopen to finish. These corrections did not weaken exact-edge, privacy, viewport or source-snapshot assertions.

Screenshots generated in `artifacts/playwright` include `highlighted-path.png`, `draggable-graph.png` and `modeled-targets.png` for desktop/mobile. Spatial boundaries used in tests are explicitly test-only fixtures, never additions to application datasets.

## G. Remaining limitations

Real datasets currently have limited/absent supplied regional geometry and some events target entities rather than regions. Such events cannot display a spatial hazard footprint; this is shown explicitly. The adapter checks supported GeoJSON structure and coordinate bounds, not geometric topology or independent geographic accuracy. It does not generate polygons from bounding boxes, facilities or registration countries. Centroids provide points only.

Hazard overlays deliberately do not auto-fit: geography outside the existing viewport requires manual pan/zoom. Basemap tiles depend on external availability; the existing offline list remains available. Dense/cyclic graphs may still contain crossing or overlapping edges, although automatically placed cards have height-aware separation. Manual dragging may intentionally overlap cards. Large graphs remain unclustered, and manual positions last only for the mounted view. Public provider/live-Supabase acceptance and future integrations remain outside Task 04 Phase 2.
