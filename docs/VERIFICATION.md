# Current verification - 2026-10-09

Actual local results after corrected-data/cloud/climate continuation:

- Backend: from `backend`, `.venv/Scripts/python.exe -m pytest tests -q` - **47 passed**. Includes independent supplied scenario/reference arithmetic through FastAPI, CSV/JSON parity and global configuration scanning, raw hashes/atomic failures, private identity/snapshot/comparison contracts, JWT checks, concurrent weather dedup/retry/stale expiry, projection mapping/integrity/overlap rejection, body limits/readiness and grounded explanation rejection/fallback.
- Frontend: `npm test` - **22 passed**. Existing engine, CSV/money/export safety, immutable history and stale response checks retained.
- Browser: `npm run test:e2e --workspace frontend` - **14 passed** on Microsoft Edge at desktop 1440x1000 and mobile 390x844. Includes imported dataset selection/search/CSV review/map/graph/scenario/evidence/comparison/save/reopen/export through the backend, fictional regression, unsupported climate responses and dependency overlay zero/reset. A prior run had two ambiguous test-selector failures; scoping Sign in to main fixed those without changing app behavior or numerical assertions.
- Final integration-status correction was checked with two additional desktop/mobile all-route/report tests: **2 passed**. Final UI HTTP 200; `/ready` reports two loaded datasets and cloudConfigured false.
- Production frontend build passed. Upstream Zod annotation notices are nonfatal. No framework migration.
- Open-Meteo external connectivity: HTTP 200 at public ocean coordinate (0,0), one-day request, expected degrees Celsius/mm/km/h units. No company identity/holding/location was sent. This is not sourced company screening.
- Supabase: URL and administrator URI stored in ignored local configuration; public key absent. Direct database hostname failed DNS, including outside sandbox. **No migrations, hosted RLS, authenticated database persistence, email recovery or two-user restart checks have run.**
- Actual CCKP downloads/geography mappings absent. Parser tests use explicitly synthetic local fixtures. No native downloaded schema claimed verified.
- Gemini uses mock provider tests only; disabled locally and externally unverified.
- Docker CLI unavailable; container file prepared but unbuilt. No external deployment, backups, monitoring or restore drill active.
- Codex browser and Windows automation both failed initialization with a kernel-assets/path error. Supabase dashboard was launched in the default browser using the OS; no dashboard interaction was performed.

## Dataset-sized benchmark

Command: `backend/.venv/Scripts/python.exe scripts/benchmark_backend.py`. Python 3.13.1; 20 sequential local runs with all dataset companies held; validation/traversal included, network/browser/database excluded.

| Dataset | Companies | Commercial edges | Holdings | Enumerated paths | p50 | p95 | Max |
|---|---:|---:|---:|---:|---:|---:|---:|
| Fictional reference | 5 | 3 | 5 | 4 | 0.50 ms | 1.17 ms | 1.43 ms |
| Corrected ClimateWeb | 215 | 350 | 215 | 17 | 194.49 ms | 600.91 ms | 666.10 ms |

These are sequential local measurements, not multi-user hosting/SLA guarantees. Raw measurement output is ignored `artifacts/backend-benchmark.json`.

## Outstanding acceptance

Follow MANUAL_SETUP.md and OPERATIONS.md. Apply both migrations with the prepared administrator script or SQL Editor; run rolled-back SQL isolation checks and `scripts/verify_cloud.py` with two actual accounts. Restart services and use `--reopen`; verify signup/confirmation/recovery/refresh/signout in a real configured browser. Supplying configuration alone is not verification. Real sourced operating analysis and CCKP products require actual inputs. Choose hosting only after local cloud acceptance.

## Historical verification before this continuation

The following record is retained as historical evidence; the current results and limits above supersede its unconnected-source statuses.

# Verification record

Performed locally on Windows with Node 24.13.1 and Python 3.13.1. Tests validate the synthetic mechanism, not empirical climate or financial accuracy.

- Backend: `cd backend; .venv/Scripts/python.exe -m pytest -q` — 35 passed. Includes golden values, facility/route/waypoint/region mapping, hop limits, cycles/parallel paths, unknown/zero inputs, capital invariance, idempotency, owner isolation for the demo repository, seven browser/Python parity variants, importer byte preservation, weather caching/failures, projection metadata, and JWT signature/issuer/audience/role/expiry checks.
- Frontend: `npm test` — 22 passed. Includes reference calculations, CSV review/validation, formula-safe exports, immutable history, storage denial and stale-response invalidation.
- Browser: `npm run test:e2e --workspace frontend` against the integrated app — 10 passed using headless Microsoft Edge, with 1440×1000 and 390×844 viewports. Includes results, downloads, comparison, keyboard path selection, CSV exclusions, route-only analysis, auth unavailable state, invalid amount blocking and denied storage.
- Screenshots of desktop graph and mobile results were inspected. An initial mobile comparison overflow caused a real test failure; wrapping input hashes and stacking narrow-screen metrics fixed it. The current ten checks pass after the Stitch integration, including report restoration/deletion and location selection.
- Build: `npm run build` generates `frontend/dist/`. Large chart/graph/map/auth pages are split using lazy imports. Non-fatal upstream Zod comment-annotation notices may appear during bundling.
- Clean installation: `npm ci` completed successfully (215 packages installed). The subsequent 20 frontend tests and production build passed from the locked dependency tree.
- Dependency audit: `npm audit` reports zero vulnerabilities after replacing the temporary Tailwind 3 fallback with the pure Tailwind 4 compiler integration.
- Supabase database migration and `supabase/tests/owner_isolation.sql`: NOT RUN, no configured database supplied. Local JWT and repository tests do not prove deployed RLS.
- Actual forecast calls, CCKP downloads, Gemini generation and real Sectivia import: NOT RUN. Provider tests use generated response-contract fixtures, not a claim of captured live observations.

## Measured engine performance

500 iterations after 20 warmups, five companies, three commercial edges, four holdings, one facility and one route. Validation and traversal are included; browser rendering, network and storage are excluded.

| Engine | p50 | p95 |
| --- | --- | --- |
| Browser engine in Node | 0.133 ms | 0.428 ms |
| Python / NetworkX | 0.449 ms | 0.706 ms |

Commands: `npm run benchmark` and `backend/.venv/Scripts/python.exe scripts/benchmark_backend.py`. These are small-fixture measurements, not production-scale latency promises.

## Environment troubleshooting encountered

Restricted subprocess/temp-file permissions initially blocked builds and importer tests; those checks were rerun with required execution approval. Tailwind's standard Node integration stalled on module imports in this environment. The final Vite adapter calls the pure Tailwind compiler without altering dependency code. Vite is pinned to 7.3.7 and Vitest to a patched 4.1 release in the lockfile. Python TestClient emits an upstream httpx deprecation notice, while all tests pass.

## Stitch integration verification (2026-10-09)

- Backend audit rerun: 35 passed; no backend numerical or schema changes.
- Frontend unit tests: 22 passed, including explicit lakh conversion/unit rejection and persisted report deletion/restoration.
- Final production build: passed, 960 modules; no new dependencies.
- Desktop/mobile workflow: 10 passed. Includes actual POST /api/v1/analysis response, golden exposure, fixed comparison, CSV matching/exclusion, JSON/CSV exports, saved report reload/open/delete, denied storage, location-to-graph IDs, what-if single-target options, and all-route overflow checks.
- Screenshots inspected: desktop overview and mobile scenario, along with original Stitch contact sheet. Original Portfolio PNG is a failed-fetch placeholder; its HTML remains available.
- All 23 exported files (11 HTML, 11 PNG entries, 1 DESIGN.md) verified byte-for-byte against the local ZIP. Ten PNG entries are valid images.
- Both localhost services respond: UI HTTP 200; API health mode demo, schema 1.0.0, model demo-1.0.0. Services remain running.
- Initial browser failures exposed UTF-8 mojibake introduced while editing on Windows; corrected using explicit UTF-8 reads/writes, preserving currency and path assertions. Final checks pass without weakening those assertions.
- Live database, RLS deployment, real authentication/email and external feeds remain unverified and deferred by scope.
