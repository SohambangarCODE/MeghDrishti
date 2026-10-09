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
