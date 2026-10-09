# Local operation and deployment preparation

No hosting is provisioned or deployed. Complete the two-user local cloud acceptance check before choosing a host or publishing.

## Start locally

From the repository root, run `npm ci`, create `backend/.venv` with Python 3.13 and install `backend/requirements.lock.txt`. Preserve existing ignored environment files when filling missing values from the examples. Then run `npm run dev:full`.

- Frontend: http://127.0.0.1:5173
- Backend health: http://127.0.0.1:8000/health
- Backend readiness: http://127.0.0.1:8000/ready
- API documentation: http://127.0.0.1:8000/docs
- Private workspace: http://127.0.0.1:5173/cloud

Ctrl+C stops both services. Restart after environment changes. Readiness proves local datasets loaded, not Supabase reachability; use the authenticated private session probe and `scripts/verify_cloud.py` for that.

## Build and deployable configuration

`npm run build` produces `frontend/dist`. A static host needs SPA rewrites to `index.html`, including `/auth/callback` and `/auth/reset`. Set `VITE_API_BASE_URL`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time. Do not expose `DATABASE_URL`, Gemini keys or service-role credentials through `VITE_` variables.

The backend container is prepared with `docker build -f backend/Dockerfile -t meghdrishti-api .` from the repository root. Docker is unavailable on the current host, so this container build is unverified. It runs as a non-root user on port 8000. Alternatively start `python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --no-access-log` using the locked dependencies.

Set `ALLOWED_ORIGINS` to the exact production frontend origin, without wildcard or trailing slash. Supply runtime URL/public key/JWT issuer/audience via hosting secrets. Use one worker while anonymous demo snapshots and weather caches remain process-local. Private snapshots persist through Supabase. Persist `data/projections` on a managed volume if importing projections after image build. Dataset promotion requires restart; retain prior normalized versions and raw manifests.

`DATABASE_URL` is an administrator migration credential used only by `scripts/database_setup.py`. Runtime private requests use the caller JWT and public key, preserving RLS. Apply ordered migrations once; never reset a populated project. Run the rollback-only SQL isolation test and the two-account API script before enabling cloud use.

## Limits, logs and refresh

Request bodies are limited to 2 MB including chunked bodies. Portfolio API inputs are limited to 1,000 rows. Existing model limits remain 1,000 companies, 10,000 commercial edges and 10,000 enumerated paths, with an explicit partial-result warning at traversal bounds. Commercial depth is 1–3. Graph display is capped independently of calculations.

Structured request logs contain generated request ID, route template, method, status and duration only. Access logs are disabled in supplied startup commands to avoid logging user query strings and record IDs. Do not enable debug payload/header logging in hosting middleware.

Weather calls use four concurrent slots, exact-coordinate request deduplication, configurable 1–16-day forecast windows, 8-second per-request timeout, up to three attempts for transient HTTP errors, provider Retry-After handling, a cache and maximum stale age. `WEATHER_REFRESH_SECONDS=0` means on-demand. Enable scheduled refresh in exactly one process with a minimum one-hour interval; multi-worker hosting needs an external scheduler/lock before enabling it. Synthetic sites never enter provider requests.

Gemini is optional and opt-in: `GEMINI_ENABLED=true`, a server-only key and a supported `GEMINI_MODEL`. It receives only bounded computed path IDs/company IDs/stress values, never capital amounts or raw holdings. Returned references/numbers must match the engine. Narration remains deterministic; provider errors fall back without changing results. External generation has not been tested.

## Backup and restore acceptance

No backup schedule or retention plan is claimed active. Confirm backup/PITR availability for the selected Supabase plan before hosting. Record the chosen retention and recovery objectives. Use Supabase-managed backups or a locally secured PostgreSQL dump through a supported connection; never store dumps containing private portfolios in Git. Back up schema/migration versions, private tables, normalized datasets, raw hashes and projection files as a consistent release set.

Test restore into a separate development project, not over the live project. Reapply verified auth/CORS configuration, verify both users' ownership, reopen retained report hashes, and compare the same immutable snapshot results. A backup is accepted only after this restore drill. Auth-user migration and credentials need the provider's supported procedure; do not assume restoring public tables alone restores login identities.

## Acceptance commands

1. `cd backend` then `.venv/Scripts/python.exe -m pytest tests -q`.
2. From root: `npm test` and `npm run build`.
3. With both services running: `npm run test:e2e --workspace frontend`.
4. `.\backend\.venv\Scripts\python.exe scripts/benchmark_backend.py` for dataset-sized sequential timings.
5. Once cloud configuration is complete: `.\backend\.venv\Scripts\python.exe scripts/database_setup.py --apply --test-rls`.
6. `.\backend\.venv\Scripts\python.exe scripts/verify_cloud.py`; restart both services; run the same script with `--reopen` using the same two confirmed accounts.

Actual outcomes are recorded in `VERIFICATION.md`. Benchmark timings exclude browser/network/database and are not multi-user load guarantees. External deployment, email recovery, database isolation and restore drills remain pending their dependencies.
