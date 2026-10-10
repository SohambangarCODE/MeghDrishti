> Historical pre-reorganization instructions. Use the root README for current paths.

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

For a different frontend port, set backend `ALLOWED_ORIGINS` to the exact origin, including hostname and port. `npm run dev:full` loads `backend/.env.local`; standalone uvicorn requires environment variables supplied by the shell/process. Examples are templates, never credentials.

API documentation: http://127.0.0.1:8000/docs. Backend tests:

```powershell
cd backend
.venv/Scripts/python.exe -m pytest -q
```

On macOS/Linux use `.venv/bin/python -m pytest -q`. Parity tests invoke Node and require `npm ci` first.

## Browser tests

With both services running (`npm run dev:full`), use `npm run test:e2e --workspace frontend`. Tests use installed Microsoft Edge by default, including 1440px desktop and 390px mobile viewports. Change the Playwright `channel` to an installed Chromium browser if necessary; browser installation is not part of the demo runtime. Screenshots, downloaded exports and failed traces go to ignored `artifacts/playwright/`.

## Cloud setup and imported data

Use [manual setup](docs/MANUAL_SETUP.md) for the prepared migrations, local environment files, auth redirects and two test accounts. `/cloud` provides explicitly imported private drafts, atomic saves, saved analysis snapshots, fixed-snapshot comparison, exports and deletion. Authentication supports persisted/refreshed sessions and callback/recovery routes. Actual database persistence and hosted RLS remain unverified until the connection/key and two accounts are available. Runtime requests use the public key plus caller JWT, never an administrator credential.

The corrected ClimateWeb files are preserved unchanged in `data/raw/climateweb/`, with hashes in `manifest.json`. JSON is the active representation; the CSV pair is a tested alternative, never combined with it. The imported backend dataset contains 215 real identities, 350 dataset-reported relationships, 327 synthetic facilities, four shared routes and 215 route usages. Select **Sectivia + synthetic operations** in the header to exercise the complete imported-data workflow. Measured operational/dependence shares remain null; demo assumptions are explicit. The fictional reference demo and its independent arithmetic remain available.

To reimport the same source: `backend/.venv/Scripts/python.exe scripts/import_climateweb.py --json data/raw/climateweb/climateweb-supply-chain-enriched.json --accept-synthetic-demo`. See the command's `--help` for the CSV-pair alternative. Validation precedes atomic promotion; restart the backend after promotion.

Weather and future-context controls call backend adapters. Synthetic sites and unsupported geography produce unavailable responses. Live Open-Meteo connectivity was checked separately; sourced company screening still requires verified operating inputs. The projection importer uses explicit inspected-column/geography mappings; no actual CCKP file has been supplied. Optional Gemini path selection is gated and validated with deterministic fallback; external generation is unverified.

Use [operations](docs/OPERATIONS.md) for startup, request limits, logging, benchmark, backup/restore procedure and deployment preparation. No external deployment is active.

See [implementation status](docs/IMPLEMENTATION_STATUS.md), [architecture](docs/ARCHITECTURE.md), [data notes](docs/DATA_NOTES.md), [assumptions](docs/ASSUMPTIONS.md), and [demo walkthrough](docs/DEMO.md).
