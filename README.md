# MeghDrishti

Synthetic portfolio dependency evaluator for analysts. Includes a Python/FastAPI/NetworkX engine and a credential-free browser engine, with a Stitch-based React UI. This is **not** a calibrated climate-damage or investment-loss model.

The eleven local Stitch HTML exports are preserved under `frontend/stitch-export/`, with route mappings and source hash in `manifest.json`. Ten PNG previews are readable; the original Portfolio PNG contains a failed-fetch placeholder, so its HTML supplies the layout. No remote project or screen IDs were exposed. See [Stitch integration and API mapping](docs/STITCH_INTEGRATION.md). `PRD.md`, `DESIGN.md` and `STITCH_PROMPTS.md` preserve the original specification.

## Run the browser-only demo

Prerequisites: Node.js 22.12+ (tested on 24.13.1), npm 11. No credentials or Python server required.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Choose **Open demo workspace → Run synthetic analysis**. The app explicitly labels the browser engine and synthetic sources. Map tiles are optional; the offline location list always works.

```sh
npm test
npm run build
npm run preview
npm run demo
npm run benchmark
```

The production evaluator build is `frontend/dist/`. `npm run preview` serves it locally. Do not open index.html directly using `file://` because browser routing/assets require HTTP.

## Run the authoritative backend

Python 3.13 was used for the locked environment. Run these commands from the repository root.

After the Python environment is installed, **`npm run dev:full` starts both services together**: frontend http://127.0.0.1:5173 and backend http://127.0.0.1:8000. It configures the UI to use NetworkX and sets matching CORS origins. Ctrl+C stops both. Stop existing processes on those ports before starting this command. The separate-terminal procedure below is useful when debugging either service.

Windows PowerShell:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.lock.txt
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

macOS/Linux:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.lock.txt
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In a second terminal create `frontend/.env.local` containing:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart `npm run dev`. Overview now identifies **FastAPI / NetworkX**. A backend failure is shown as an error; it never silently switches engines. Both engines use the same synthetic dataset and fixture values. Remove the variable and restart to return to browser-only mode.

For a different frontend port, set backend `ALLOWED_ORIGINS` to the exact origin, including hostname and port. Backend environment variables are supplied by the shell/process; `.env.example` is a template, not an automatically loaded secret file.

API documentation: http://127.0.0.1:8000/docs. Backend tests:

```powershell
cd backend
.venv/Scripts/python.exe -m pytest -q
```

On macOS/Linux use `.venv/bin/python -m pytest -q`. Parity tests invoke Node and require `npm ci` first.

## Browser tests

With both services running (`npm run dev:full`), use `npm run test:e2e --workspace frontend`. Tests use installed Microsoft Edge by default, including 1440px desktop and 390px mobile viewports. Change the Playwright `channel` to an installed Chromium browser if necessary; browser installation is not part of the demo runtime. Screenshots, downloaded exports and failed traces go to ignored `artifacts/playwright/`.

## Supabase preparation

No Supabase connection is claimed. Apply `supabase/migrations/202610090001_initial.sql` to a disposable/local project, then run `supabase/tests/owner_isolation.sql` there. This SQL test is not a substitute for actually running the migration against Postgres.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env.local` to enable authentication. Sessions are memory-only by default. Configure email confirmation/reset redirects in Supabase. Server JWT verification requires `SUPABASE_JWT_ISSUER` (normally the project URL plus `/auth/v1`) and `SUPABASE_JWT_AUDIENCE=authenticated`. Use asymmetric signing keys supported by the JWKS verifier (ES256/RS256); legacy shared-secret JWT validation is deliberately not inferred.

Public operational records are read-only to browser roles. Portfolios, child holdings, overlays and run records use owner/parent checks. Run snapshots have no client update/delete grants. `SupabaseRepository` uses the user's JWT, never a service-role key. The current analysis UI remains a synthetic demo even when auth is configured. Private persistence adapters are prepared; the full sourced portfolio workflow awaits a verified dataset and database integration tests.

## Data and integrations

Supply real datasets later. The raw-data directory is currently empty. A company-only staging importer accepts explicit column mappings after the actual schema is inspected; it does not invent relationships, operational sites, routes or shares. Operational enrichment belongs in `data/enrichment/`.

Open-Meteo adapter code is disabled by default, tested with a captured-contract fixture, and rejects synthetic coordinates. It implements seven-day heat screening, original timestamps, caching and explicit stale/unavailable states. It is not wired as a live feed for fictional facilities. CCKP projection validation preserves periods/scenarios; no projection values were supplied. Gemini is not connected; deterministic explanations are implemented.

See [implementation status](docs/IMPLEMENTATION_STATUS.md), [architecture](docs/ARCHITECTURE.md), [data notes](docs/DATA_NOTES.md), [assumptions](docs/ASSUMPTIONS.md), and [demo walkthrough](docs/DEMO.md).
