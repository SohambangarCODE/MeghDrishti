# Current implementation and acceptance status

The historical page matrix below describes the earlier Stitch baseline. The authoritative current requirement/status table is [REMAINING_WORK.md](REMAINING_WORK.md), with actual commands in [VERIFICATION.md](VERIFICATION.md).

Since that baseline, the corrected ClimateWeb dataset is integrated across the API/UI; `/cloud`, `/auth/callback` and `/auth/reset` are implemented; weather/projection query panels and dependency overlays are connected; atomic private persistence and comparison use caller JWTs. Actual hosted cloud authentication/RLS remains unverified. Projection files and verified operational inputs are absent. Optional Gemini is implemented and fixture-tested, externally unverified. No deployment is active.

## Historical baseline (superseded where noted above)

The current deliverable is an end-to-end synthetic evaluator with the eleven local Stitch designs adapted to the working React routes. It is not a connected sourced-data platform. Export provenance, corrections and API mappings are documented in STITCH_INTEGRATION.md.

## Page matrix

| Page | Status | Implemented behavior and limits |
| --- | --- | --- |
| P01 /welcome | Implemented Stitch presentation | Demo entry, purpose, coverage and sign-in links; no login required. |
| P02 /auth | Implemented configuration gate | Supabase sign-in/sign-up/reset request handling and sign-out; unavailable without configuration. Real account/email flows unverified. |
| P03 /overview | Implemented | Draft holdings, engine label, latest immutable result metrics, run/edit/graph/compare navigation, empty state. |
| P04 /portfolio | Implemented | Add/edit/remove, CSV template and preview, exact name/qualified ticker matching, explicit exclusion, duplicate merge, explicit rupees/lakh conversion, invalid amount/unit/currency blocking, reset. |
| P05 /graph | Implemented | React Flow typed graph, directed semantics, deterministic layout, search/type/affected filters, zoom/fit, hop draft control, selected paths/evidence and keyboard table alternative; 100-node display bound. |
| P06 /locations | Implemented synthetic scope | Illustrative facility marker, optional Leaflet/OSM tiles, offline list, layer toggles, graph links, honest unavailable weather. No invented route geometry. |
| P07 /scenarios | Implemented synthetic scope | Stored heat, facility/route/both, intensity/vulnerability/transmission assumptions and 1–3 hops; future-context controls without fabricated data. Sourced auto-screen workflow awaits operations. |
| P08 /results/:runId | Implemented | Snapshot metrics, direct/indirect unknown handling, tables/chart, strongest and alternative paths, shared dependencies, assumptions, deterministic explanation, JSON/CSV/print. |
| P09 /compare | Implemented allocation workflow | Fixed source/event/scenario transfer, amount validation, preserved capital, apply to draft/reset. Engine supports assumption overlays; a separate supplier-substitution editor is not implemented. |
| P10 /evidence | Implemented synthetic scope | Integration statuses, source/version labels, missing inputs, assumptions; refresh disabled for unavailable services. |
| P11 /reports | Implemented local scope | Bounded local snapshots, save/open/delete, search and exports; in-memory fallback. Authenticated sourced report workflow is prepared at adapter level, not integrated/verified. |

All P01–P11 use the shared Stitch presentation. Original HTML, previews and design metadata are preserved; project/screen IDs remain unknown without remote access.

## Acceptance matrix

| ID | Status | Evidence / limit |
| --- | --- | --- |
| A01 | Implemented from local exports | Eleven original HTML screens, ten readable PNG previews, one failed-fetch PNG placeholder and exported DESIGN.md preserved. Manifest maps routes. |
| A02 | Implemented | Lockfile install, Vite build, browser and backend setup procedures; credential-free engine and API modes. See verification log. |
| A03 | Implemented | Parser/validation tests and desktop/mobile import workflow. |
| A04 | Implemented | Facility-only, route-only, waypoint/region mapping, overlap maximum and commodity non-duplication. |
| A05 | Implemented | Reference arithmetic and 1–3 hop tests; selectable path UI. |
| A06 | Implemented | Cyclic fixture termination with no repeated company in paths. |
| A07 | Implemented | Duplicate-record rejection, company merging and strongest parallel path tests. |
| A08 | Implemented | Unknown direct stress retained even with positive indirect results. |
| A09 | Implemented | Fixed-snapshot, capital-preserving allocation comparison in both engines and browser tests; immutable raw overlay application. |
| A10 | Implemented synthetic scope | Source labels in snapshot/CSV, shared result data for charts/table/graph, local restoration; final print dialog not automated. |
| A11 | Implemented | Revision/sequence cancellation tests; obsolete success and failure cannot replace current state. |
| A12 | Implemented adapter scope | Weather-cache/unavailable fixtures and explicit API errors; no sourced live feed enabled. |
| A13 | Blocked on configured Postgres | RLS migration and transactional isolation test supplied. JWT cryptographic checks and demo-owner API isolation pass; actual Supabase RLS test has NOT run. |
| A14 | Implemented Stitch presentation | Desktop/mobile workflow, keyboard path selection, import errors, map list fallback and downloads tested; targeted screenshots inspected. |
| A15 | Implemented | This matrix separates usable demo, prepared adapters, unavailable inputs and unverified external connections. |

## Integration status

| Component | Status |
| --- | --- |
| FastAPI / NetworkX | Running local synthetic API; reference, auth-contract, idempotency, comparison and parity tests pass. |
| BrowserSimulationService | Usable without server or credentials; shares fixture and tested arithmetic. |
| Supabase | Migration, private adapters and authentication integration prepared; no project credentials or DB verification. Full sourced UI persistence remains pending. |
| Sectivia | No source supplied. Generic explicit-column company staging/import-integrity code tested. Relationship-specific mapping awaits actual schema. |
| Open-Meteo | Configuration-gated adapter with timeout/cache/retries/unit validation and heat transform tested against generated provider-contract fixtures. Not connected to demo sites. |
| World Bank CCKP | Normalized metadata/period/scenario validator tested. Native downloaded-file importer and sourced future view await supplied files. |
| Gemini | No live generation; deterministic result explanation works. Optional grounded generation adapter is deferred. |

Current constraints do not block synthetic evaluation. Live operations, authenticated DB behavior, source-specific importers and final visual-design replacement must be verified when actual inputs are supplied.
