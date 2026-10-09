Current demo update: independent map-point live weather lookup is implemented at `/api/v1/weather/point` and Locations. Coordinates may be clicked or entered manually. A real seven-day forecast passed through the backend. It is explicitly excluded from portfolio calculations. See JUDGES_DEMO.md.

# Remaining work tracker

Updated 2026-10-09. Recoverable baseline checkpoint: `b4fa623`. Original PRD, fictional fixture, Stitch exports and unrelated changes were preserved. No overall completion percentage is assigned.

| Requirement | Current implementation | Remaining action | Dependencies | Verification | Actual status |
|---|---|---|---|---|---|
| Corrected dataset | Raw hashes; JSON active, CSV parity; exact IDs; global configuration; one asset representation; effective weights; atomic promotion; full workflow | None for supplied synthetic demo | Supplied files installed | Three independent scenarios and comparison through actual API; desktop/mobile workflow | locally_verified |
| Fictional reference | Original fixture and strongest-simple-path engine retained | None for local demo | Local runtime | Backend/frontend/browser golden arithmetic | locally_verified |
| Supabase persistence | Caller-JWT repository; atomic draft/holdings/overlays; immutable runs/results; idempotency; comparison/export/delete; explicit demo import | Apply migrations, two-user RLS and restart tests | Working DB connection, public key, two confirmed users | Local mock-store/JWT tests; actual SQL/RLS not run | awaiting_user_action |
| Authentication | Persisted SDK session/refresh; signup/in/out; callback/reset; private guard; expiry and owner-state clearing | Real email, refresh and browser/API/DB verification | Supabase config/email/accounts | JWT tests and unconfigured browser guard; real accounts unverified | awaiting_user_action |
| Weather API/UI | Configurable forecast, bounded retries/cache/dedup/stale handling, schedule, metadata, synthetic exclusion, refresh panel | Supply verified operating inputs and validate sourced analysis snapshots | Sourced operating/dependency inputs | Contract/concurrency/stale tests; synthetic exclusion in API/browser | awaiting_data |
| Open-Meteo connectivity | Direct public forecast request returned HTTP 200 and expected units | Company screening awaits sourced inputs | External provider | One-day ocean-coordinate connectivity test; no company data sent | externally_verified |
| CCKP | Explicit CSV/JSON mapping, raw hash storage, atomic writes, overlap rejection, geography-gated query/UI | Inspect real download schema and map verified geographies | Actual downloads and operating geography | Synthetic parser fixture and unavailable API/browser checks only | awaiting_data |
| Sourced operational analysis | Data-state contract; unknown measured shares preserved; no promotion of synthetic evidence | Source-specific operating adapter and sourced run mode against actual evidence | Verified facilities/routes/dependencies not supplied | No sourced analysis claimed | awaiting_data |
| Frontend | Stitch layout retained; imported dataset workflow; cloud and climate controls | Authenticated browser acceptance | Cloud dependencies above | Build and desktop/mobile synthetic workflows | locally_verified |
| Dependency overlays | Existing edge selection, bounded effective weight, source/draft preview, rerun/reset; replacement not applied twice | None for bounded synthetic editor | Existing dataset | Browser zero-weight and reset/golden-value checks | locally_verified |
| Optional Gemini | Opt-in server adapter; bounded computed paths without amounts; reference/numeric validation; deterministic fallback and result-page action | External test if enabled | Key and supported model | Mock success, fabricated values/IDs and provider failure tests | locally_verified |
| Local operation | Combined startup; health/readiness; 2 MB body limit; metadata-only logs; model bounds; dataset benchmark | Hosted concurrency testing | Hosting/runtime target | Request-bound/readiness test; 215-company sequential timing | locally_verified |
| Deployment/backup | Non-root Dockerfile, frontend build, SPA/CORS/environment and restore runbook | Container build; hosting choice after cloud acceptance; publish and test backup restore | Docker unavailable; cloud/hosting pending | Production frontend build passed; no container/deployment/restore verification | awaiting_user_action |

Current blockers: direct Supabase DB hostname failed DNS; session-pooler URI and publishable key remain missing locally. Codex browser and desktop automation failed to initialize, so the dashboard was only launched in the default browser. Exact actions: [MANUAL_SETUP.md](MANUAL_SETUP.md).

Local tests do not prove deployed RLS. Real identities and reported links do not verify synthetic operating enrichment. Actual outcomes: [VERIFICATION.md](VERIFICATION.md). Startup and acceptance procedures: [OPERATIONS.md](OPERATIONS.md).
