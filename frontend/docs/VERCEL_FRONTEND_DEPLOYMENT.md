# Vercel frontend deployment

1. Manually create a GitHub repository and upload/publish this project using Git-aware tooling that respects `.gitignore`. No Git operations were performed by Codex. Do not upload local environment files, node_modules, .venv, artifacts or local archives.
2. Open https://vercel.com/new, import that repository, and choose Framework **Vite**.
3. Root Directory: **frontend**. Build Command: **npm run build**. Output Directory: **dist**. Install Command: **npm install**. Node.js: **22.x**.
4. Enable **Include source files outside of the Root Directory in the Build Step**. The root npm workspace lockfile and backend/config and backend/shared JSON files are required. Do not upload only frontend as a standalone repository.
5. Configure Production (and optionally Preview) variables:
   - `VITE_SUPABASE_URL`: public Supabase project HTTPS URL.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: publishable/public anon key. Legacy `VITE_SUPABASE_ANON_KEY` is also accepted.
   - `VITE_API_BASE_URL`: reachable public HTTPS FastAPI origin, without `/api/v1`. Omit until the backend is publicly hosted; invalid/local URLs are disabled with a build warning and an explicit frontend-only notice.
6. Click Deploy and copy the resulting public URL. No public URL is created by folder preparation or a local build.
7. Check `/welcome`, `/auth`, and direct refresh on a protected route. The rewrite excludes `/api`; missing API handlers cannot be disguised by index.html.
8. Add the deployed origin's `/auth/callback` and `/auth/reset` to Supabase's allowed redirects. Production auth/email callback acceptance is a separate verification step.

No backend is deployed here. Without an API origin, the UI explicitly labels the fictional browser demo; Sectivia loading, private persistence and saved analysis, Gemini, weather and projection APIs need publicly hosted FastAPI and appropriate CORS. Configured Supabase auth can communicate directly with Supabase, but requires public-site verification.

Never put `GEMINI_API_KEY`, `DATABASE_URL`, Supabase service-role keys or their VITE-prefixed variants in the frontend. Existing frontend/.env.local is local-only and ignored. All VITE variables are browser-visible. Redeploy after changing them.

Root npm commands still work. For direct local build: `cd frontend`, `npm install`, `npm run build`. Backend Docker uses the repository root as build context: `docker build -f backend/Dockerfile .`.

If a previous build failed on a local API URL, publish the updated frontend/vite.config.js and redeploy. Set VITE_API_BASE_URL to your verified public backend origin when it is ready. This fallback does not make Sectivia/private persistence available or conceal an unreachable valid backend.
