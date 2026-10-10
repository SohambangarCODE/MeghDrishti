# MeghDrishti

React/Vite frontend and Python/FastAPI climate-risk analysis backend.

## Repository layout

```text
FusionMVP/
  frontend/
    src/                 React pages, services and browser reference engine
    e2e/                 Playwright regression tests
    scripts/             Development launcher and Node tooling
    docs/                Vercel instructions, recording script and design notes
    stitch-export/       Destination for future design exports
    vercel.json          SPA routes and Vite deployment settings
    package.json
  backend/
    app/                 FastAPI APIs, adapters and analysis engine
    tests/               Backend and parity regression tests
    scripts/             Importers, setup and verification commands
    data/                Unchanged supplied datasets and normalized snapshots
    config/              Shared model defaults
    shared/              Shared evidence coverage definitions
    supabase/            Existing migrations and isolation verification SQL
    docs/                PRD, audits, setup and technical documentation
    Dockerfile
    requirements.lock.txt
  package.json           Existing npm workspace and convenient root commands
  package-lock.json      npm workspace dependency lock
  README.md
  .gitignore
  .dockerignore
  .gitattributes
```

Only `backend/` and `frontend/` are source directories at the root. `.git` and ignored `node_modules` are local tooling; do not upload them through manual drag-and-drop. Root npm metadata is intentionally retained so existing workspace commands and the lockfile remain valid.

## Run locally

From the repository root:

```powershell
npm install
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.lock.txt
npm run dev:full
```

Keep `frontend/.env.local` and `backend/.env.local` private. The launcher opens services at http://127.0.0.1:5173 and http://127.0.0.1:8000. Backend local configuration remains beside its requirements; it is not moved into frontend.

## Deploy the frontend to Vercel

Import the GitHub repository, choose **Vite**, Root Directory **frontend**, Build Command **npm run build**, Output Directory **dist**. Enable **Include source files outside of the Root Directory in the Build Step**: frontend imports the existing shared JSON definitions from backend/config and backend/shared. These are model/evidence definitions, not credentials.

Configure public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Set `VITE_API_BASE_URL` only to a reachable public HTTPS FastAPI origin; otherwise omit it and the UI explicitly describes the fictional frontend-only preview. Never expose Gemini, database credentials or Supabase service-role keys as Vite variables. No public backend is introduced by the frontend deployment.

See [Vercel instructions](frontend/docs/VERCEL_FRONTEND_DEPLOYMENT.md), [Supabase setup](backend/docs/MANUAL_SETUP.md) and [video script](frontend/docs/VIDEO_DEMO_SCRIPT.md).

## Verification

```powershell
npm run test
npm run build
backend/.venv/Scripts/python.exe -m pytest backend/tests -c backend/pytest.ini
npm run test:e2e --workspace frontend
```

Browser tests require the frontend running. Windows-specific environment limitations may require a normal terminal outside the agent sandbox.

## Import and verification tools

```powershell
backend/.venv/Scripts/python.exe backend/scripts/import_climateweb.py --json backend/data/raw/climateweb/climateweb-supply-chain-enriched.json --accept-synthetic-demo
backend/.venv/Scripts/python.exe backend/scripts/verify_cloud.py
```

Source dataset contents and hashes are preserved. Archived one-off exploratory scripts, duplicate root local environment file and previous screenshots/logs are kept locally under backend/local-archive or backend/artifacts, excluded from Git and Docker. Historical instructions are retained in backend/docs/README_HISTORY.md; use this README for current paths.
