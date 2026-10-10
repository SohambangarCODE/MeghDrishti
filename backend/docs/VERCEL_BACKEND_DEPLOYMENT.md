# Fix the backend Vercel NOT_FOUND deployment

Live check on 2026-10-10: `/`, `/health`, `/docs` and `/api/v1/datasets` at the supplied backend domain all returned Vercel HTTP404 with `x-vercel-error: NOT_FOUND`. That is platform routing, not the existing FastAPI's JSON error handler. Dashboard configuration was not inspected; the exact remote project root/framework cannot be asserted.

The backend now has a conventional pinned `requirements.txt`, explicit `app.main:app` entrypoint in `pyproject.toml`, Python3.13 selection, and `vercel.json` FastAPI configuration. No frontend SPA rewrite applies to the backend project. The build command copies the unchanged canonical reference fixture into backend/fixtures so runtime does not depend on a sibling frontend directory. Generated fixture is ignored; the deployment build recreates it. A small root endpoint links health/docs/datasets.

## Manual redeployment

1. Publish these changed files to the same GitHub repository manually. Do not upload environment files, virtual environments, node_modules, local archives or artifacts. No Git actions were performed by Codex.
2. Open Vercel → **meghdrishti-backend** → Settings → Build and Deployment.
3. **Root Directory: backend**. Enable **Include source files outside of the Root Directory in the Build Step**, because fixture packaging reads frontend/src/fixtures/reference.json during build.
4. **Framework Preset: FastAPI**. Vercel installs dependencies from backend/pyproject.toml and backend/uv.lock. requirements.txt mirrors the existing pinned runtime versions. Leave Install Command at framework default; remove any old npm override. Build Command is **python scripts/prepare_vercel.py**, supplied by backend/vercel.json. Clear any old npm/Vite Build Command override. Output Directory should be the framework default, with no `dist` override.
5. Set backend Production environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY` (legacy `SUPABASE_ANON_KEY` supported)
   - `ALLOWED_ORIGINS`: exact deployed frontend origin; multiple allowed origins can be comma-separated without spaces
   - `GEMINI_API_KEY` if Gemini is required; never VITE-prefixed
   - `OPEN_METEO_ENABLED=true` if weather should be enabled
   - `WEATHER_REFRESH_SECONDS=0` for on-demand serverless requests
   - Existing optional `GEMINI_MODEL` or `GEMINI_ASSESSMENT_MODEL` only if configured; keep keys server-side
   - `SUPABASE_JWT_ISSUER` and `SUPABASE_JWT_AUDIENCE` are optional existing settings; defaults derive issuer from SUPABASE_URL and use audience authenticated
   Database migration administrator `DATABASE_URL` is not needed by the Supabase REST private-run workflow and must never be in frontend.
6. Deployments → Redeploy the latest changed commit, preferably without the previous build cache. Inspect build logs for FastAPI detection, dependency installation and “Packaged canonical reference fixture unchanged”. Check Functions/runtime logs if invocation fails.
7. Verify the backend domain: `/` should return JSON service links; `/health` should return status ok; `/docs` should display Swagger; `/api/v1/datasets` should list reference and climateweb. A platform404 means the project routing/build still needs attention. A function500 means the function was found but initialization failed; inspect runtime logs.
8. In the separate FRONTEND project, set `VITE_API_BASE_URL=https://meghdrishti-backend.vercel.app` (without `/api/v1`) and redeploy. Verify actual save, analysis, reports and assessment from the deployed frontend. Do not point the browser at a localhost API.

## Local checks

From repository root:

```powershell
backend/.venv/Scripts/python.exe backend/scripts/prepare_vercel.py
$env:PYTHONPATH='backend'
$env:VERCEL='1'
backend/.venv/Scripts/python.exe -m pytest backend/tests -c backend/pytest.ini -q
```

No external deployment was performed by this fix. Local packaged-mode checks are not proof of production connectivity. Serverless demo-run memory and weather cache are instance-local; private Supabase reports are the persistence workflow. Provider quotas, CORS, production auth redirects and immutable snapshot verification still require live testing after redeployment.

Official references: https://vercel.com/docs/frameworks/backend/fastapi and https://vercel.com/docs/functions/runtimes/python.

## Fix for the 11:32 and 11:27 build logs

The 11:32 build failed because the previous pyproject.toml had tool.vercel configuration but no required project metadata. It now contains a valid [project] table, Python version constraint, existing pinned runtime dependencies, tool.uv package=false and the existing app.main:app entrypoint. A real uv lock command resolved 34 packages and generated backend/uv.lock; offline lock consistency also passed.

The 11:27 build ran commit 30385bf and could not find scripts/prepare_vercel.py. Redeploying that commit cannot apply the current fix. Publish backend/pyproject.toml, backend/uv.lock, backend/scripts/prepare_vercel.py, backend/vercel.json, backend/.python-version, backend/requirements.txt and the existing fixture-loading/main route changes together. Confirm the GitHub backend/scripts directory contains prepare_vercel.py before deploying the newest commit. Generated backend/fixtures is intentionally ignored; the build creates it from the unchanged canonical frontend fixture.

Local verification of this correction: dependency resolution passed, offline lock check passed, exact python scripts/prepare_vercel.py command from backend passed, manifest/build-command consistency and fixture byte hashes passed. No production deployment was performed and no Git actions were taken.

## CORS fix for the deployed frontend

Live verification: GET health, datasets and reference fixture each returned HTTP200, but without Access-Control-Allow-Origin for https://megh-drishti-frontend.vercel.app; OPTIONS preflight returned400 Disallowed CORS origin. This proves the API was running and the exact frontend origin was absent from its allowlist.

The backend now always permits that explicitly approved exact frontend origin alongside configured clients. Configured comma-separated origins are trimmed, trailing slashes removed and duplicates removed. No wildcard was added, and bearer authentication and owner checks are unchanged.

Preferred Vercel backend Production environment value:

```text
ALLOWED_ORIGINS=https://megh-drishti-frontend.vercel.app
```

Publish backend/app/config.py and backend/app/main.py, then redeploy the backend's newest commit. Alternatively, setting the exact ALLOWED_ORIGINS value and redeploying the current backend resolves this configuration mismatch without waiting for code publication. Environment changes do not update a deployment until redeployment.

The frontend API origin is already reaching the correct backend based on the reported console URLs. Keep VITE_API_BASE_URL=https://meghdrishti-backend.vercel.app. Frontend redeployment is unnecessary for this CORS-only backend change.

After redeployment, refresh the frontend. Backend responses to its Origin header should contain Access-Control-Allow-Origin: https://megh-drishti-frontend.vercel.app; preflight should return200. This is not proof of private persistence or provider connectivity; verify those workflows separately.

CORS verification: nine focused tests passed; full backend regression 107 tests passed. Exact frontend GET responses and authenticated POST preflight carry the allowed-origin header; unrelated/lookalike origins are denied and missing JWT still yields401. No production redeployment was performed.
