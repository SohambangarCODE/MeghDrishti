# Task 03 Increment 2 — entity evidence transparency

## Changes

| File | Purpose |
| --- | --- |
| `frontend/src/services/evidence.js` | Extract the existing claim predicates and per-company records; add conservative, pure source-record joins and short entity labels. No network calls, persistence or global cache. |
| `frontend/src/services/coverage.js` | Reuse the extracted predicates/company records while preserving the existing completeness response and hash. |
| `frontend/src/state/AppState.jsx` | Memoize one evidence index for the editing dataset and a separate index for the active private snapshot. Private indices are scoped to the current session/source and become null when the active run clears. |
| `frontend/src/components/HoldingEvidence.jsx` | Compact operating-location and supplier-measurement indicators with explanatory titles. |
| `frontend/src/pages/Portfolio.jsx` | One evidence column for editable holdings, plus a collapsed, read-only historical holdings evidence table when a private report is active. Existing editing, matching, saving and deletion are unchanged. |
| `frontend/src/pages/Graph.jsx` | Add commercial relationship provenance and weight-basis labels to accessible edges, the readable relationship list and selectable details. Reset selection on dataset changes and avoid source-snapshot fallback. |
| `frontend/src/pages/Locations.jsx` | Use the private immutable snapshot when active; label facilities/routes in list, selection details and Leaflet tooltips. Reset map state on source changes. Historical snapshots cannot refresh their facility IDs against the current installed-dataset weather API. |
| `frontend/src/tests/entityEvidence.test.js` | Nine focused tests for claim semantics, reliable joins, missing/ambiguous sources, immutability and identical numerical results. |
| `frontend/e2e/entity-evidence.spec.js` | Four scenarios on both desktop/mobile: mixed evidence, dataset switching, private history/logout and private history/account change. Capture screenshots of the three pages. |
| `docs/TASK03_INCREMENT2.md` | Completion report and verification record. |

## Source selection

Portfolio's editable table always classifies `app.holdings` against the selected editing dataset (`app.data.dataset`). It never attaches historical evidence to a live editing row merely because company IDs coincide. Its separate “Saved report holdings evidence (immutable snapshot)” table uses only `activeCloudRun.portfolioSnapshot` and `activeCloudRun.sourceSnapshot` and has no editing actions.

Graph uses the chosen run's `sourceSnapshot` and `portfolioSnapshot`, with an active private run taking priority. If no run is being viewed, it uses the editing dataset/holdings. Private runs reuse the session-scoped index; public historical runs receive a local memoized index for their own source. Missing snapshots cannot silently select today's dataset.

Locations uses the active private run's `sourceSnapshot`; otherwise it uses the selected installed dataset. Its keyed view clears previous map, selected weather point and local UI state when switching sources. An incompatible snapshot displays unavailable instead of replacing it with installed data. Existing scenario-edit actions remain available for the installed context; historical map records are read-only and do not rewrite the current scenario.

Evidence-page completeness remains unchanged. New page indicators do not invoke the public coverage endpoint or calculate full completeness hashes. Source indices are built once per dataset/source identity and reused through the AppState provider; they are never stored in localStorage, demo history or shared query caches. Account changes/logout retain the existing owner/generation isolation and unmount protected views.

## Classification rules

The extracted rules retain Increment 1 semantics: sourced record provenance, explicit `sourceFields.fieldEvidence[claim]`, matching evidenceIds/entityIds, an HTTP(S) URL, a nonblank claim and sourced/verified evidence status. Explicit synthetic flags prevent promotion to sourced status. Generic dataset attribution is insufficient. Python/browser completeness parity verifies that the extraction preserves the existing metrics.

Company operating labels represent recorded sourced-coordinate presence, synthetic-only sites or unknown evidence. Supplier dependence is measured only when all recorded incoming commercial weights meet the existing claim criteria. Companies without any recorded commercial edges say “No recorded commercial relationships”; that is not a claim of zero actual dependence. Unmatched/excluded/ambiguous/absent companies remain unavailable.

Graph edge records are joined by exact stable ID and both supplier/customer endpoints. Dataset-reported topology is shown separately from an assumed simulation weight. A measured weight needs claim-specific dependencyWeight evidence, including for a numerical zero. An absent or unreliable record stays unknown. Operational and commodity links are not promoted to commercial dependency weights or extra hops.

Facility and route labels distinguish synthetic, sourced and unknown evidence. Invalid coordinates/geometries cannot receive sourced geometry labels. Route geometry evidence alone does not establish company route usage, shipment direction or observed shipments. Source indices validate dataset structure, IDs, versions and references conservatively; incompatible snapshots return unavailable/unknown labels.

## Browser observations

The focused browser scenarios verified:

- One compact holdings evidence column; excluded input remained unavailable. Mixed test data showed sourced coordinates, measured incoming dependence, synthetic sites and unknown operating evidence separately.
- Commercial edges with reported topology showed assumed weights separately; missing relationship provenance and missing measurement support remained unknown. React Flow and its readable alternative remained usable.
- Leaflet/list source labels reflected the individual facility/corridor. A private report's sourced test site and corridor stayed historical while the installed selector remained ClimateWeb and the editable holding remained synthetic.
- Private historical labels disappeared on logout and after another account logged in. No private coverage requests or private localStorage markers appeared.

Screenshots are generated under `artifacts/playwright/entity-evidence-*` by the final browser run: `portfolio-evidence.png`, `graph-evidence.png`, `locations-evidence.png` and `private-locations-evidence.png`. Sourced records in these screenshots are explicit test fixtures, not newly researched production evidence.

## Verification

Completed verification on 2026-10-10:

| Check | Command | Actual result |
| --- | --- | --- |
| Focused entity browser scenarios | `npm run test:e2e --workspace frontend -- e2e/entity-evidence.spec.js` | **8 passed**, desktop/mobile, 49.6 seconds. |
| Frontend unit suite | `npm run test --workspace frontend` | **50 passed**, 7 test files, including 9 new entity tests and unchanged numerical golden tests. |
| Relevant backend contracts/parity | From `backend`: `.venv/Scripts/python.exe -m pytest tests/test_coverage.py -q` | **7 passed** in 4.13 seconds; existing Starlette test-client deprecation warning. Backend code was not changed. |
| Complete browser regression | `npm run test:e2e --workspace frontend` | **82 passed**, 41 desktop and 41 mobile, 7.1 minutes, without retries. |
| Production build | `npm run build --workspace frontend` | **Passed**, 978 modules, 13.21 seconds. Existing Zod annotation and >500 kB bundle warnings remain. |

Earlier exploratory verification found four failures across two completed subset runs. The initial coverage/routes run had 4 passes and 1 cold-start timeout; its trace showed page/fixture startup consuming the test deadline before the ClimateWeb request, and that unchanged test passed subsequent verification. The next desktop subset had 5 passes and 3 new test failures: dirty sample switching was correctly cancelled without an explicit confirmation handler, and two historical-route assertions incorrectly treated the reference fixture's null geometry as sourced. The tests now accept the expected discard confirmation and supply explicit test-only geometry when testing a sourced route. No existing assertions or timeouts were weakened. All final checks above pass.

Reviewed desktop screenshots of Portfolio, Graph and private Locations. Evidence labels fit the existing table/list layouts; the selected edge inspector displayed unknown provenance separately from weight evidence, and the private map list displayed historical sourced test records alongside synthetic records. Responsive checks passed on both viewport sizes. Full-page captures include the existing sticky header at the browser's current scroll position; no styling redesign was performed.

## Limitations and later work

Production datasets still lack the measured operating evidence identified by the audit. No fields were fabricated or raw/normalized datasets changed. Source labels identify linked evidence, not independent verification, actual supply-chain completeness or provider connectivity. Structurally incompatible saved snapshots cannot be repaired from current data. Historical weather refresh is unavailable because the existing public weather API operates on installed datasets; this increment does not add a private historical weather integration.

Original datasets, simulation formulas/weights, authentication, JWT/RLS, migrations, private API/report contracts and provider integrations remain unchanged. Live email delivery and real-account RLS acceptance are separate from mocked browser verification. Research/import of sourced operating data, evidence drill-down and future provider integrations belong to later scoped work. No Task 04 work was started.
