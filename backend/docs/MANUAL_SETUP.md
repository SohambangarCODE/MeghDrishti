# Manual setup

## Frontend authentication environment

Create or update `frontend/.env.local` with these exact names:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PROJECT_PUBLISHABLE_KEY
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The first two variables enable the authentication form. Copy their values from
your project's Connect dialog or API settings. The API base URL is additionally
required for private FastAPI persistence, not for Supabase Auth itself. Backend
variables without the `VITE_` prefix do not configure the frontend. Vite exposes
these values to the browser: never use a secret/service-role key or database
password. Keep `.env.local` ignored by Git. Restart Vite after changes (or restart
`npm run dev:full` for both services); production builds must be rebuilt.
Open `/auth` to see the Sign in form.

### Mocked authentication tests

With the frontend running, run from the repository root:

```powershell
npm run test:e2e --workspace frontend -- auth.spec.js
```

The full `npm run test:e2e --workspace frontend` command also discovers this suite.
It intercepts all `/auth/v1/**` requests using `page.route`, mocks signup, password
login and logout, and rejects unexpected auth calls without contacting Supabase.
It checks signup confirmation messaging, login, session persistence across reload,
logout persistence, and rejected-login notices on desktop and mobile. No real keys
or users are embedded. Email delivery and real cloud authorization remain separate
acceptance checks.

No real Supabase project is necessary for this suite. To use an isolated test
server, set process-only dummy values in a separate PowerShell terminal:

```powershell
$env:VITE_SUPABASE_URL = 'https://auth-test.supabase.co'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mock_only'
npm run dev --workspace frontend -- --host 127.0.0.1 --port 5174 --strictPort
```

In the test terminal set `$env:E2E_BASE_URL = 'http://127.0.0.1:5174'`, then run the
auth-only command above. Dummy credentials are for intercepted tests only. Close
these terminals afterward to discard the environment overrides. The frontend
still needs its normal demo data source (FastAPI when `VITE_API_BASE_URL` is set).

## Action required: Supabase project and test accounts

Current status: the project URL is configured and the administrator database URI is stored only in ignored backend/.env.local. The direct database hostname failed DNS resolution during verification, including outside the sandbox. No migrations were applied. The publishable key is still missing; no Supabase CLI or callable Supabase MCP is available.

To unblock database setup, copy the actual **Connect > Session pooler** URI into `DATABASE_URL` in `backend/.env.local`, percent-encode reserved password characters, and retain `sslmode=require`. Do not paste the URI into chat. Alternatively, apply the migrations using SQL Editor below. Rotate the database password shared in chat and update the local URI. The administrator URI is used only by `backend/scripts/database_setup.py`, never by the browser or runtime API. Once configured, run `.\backend\.venv\Scripts\python.exe backend/scripts/database_setup.py --apply --test-rls`.

1. Create/select a Supabase project at https://supabase.com/dashboard. Use a development project. In its **Connect** dialog copy Project URL and **publishable** key (also available in **Settings > API Keys**). Do not copy a secret/service-role key. Project reference is the subdomain of the URL; it is not otherwise required by this runtime.
2. In **SQL Editor**, run these complete files in order once:
   - `backend/supabase/migrations/202610090001_initial.sql`
   - `backend/supabase/migrations/202610090002_private_workflows.sql`
   The second migration records both versions in `public.app_migrations`. If the initial migration already exists, do not rerun it; inspect `select * from public.app_migrations;` after applying the second. No database reset is needed. Never apply the initial migration over unrelated existing tables with these names.
3. Update the existing `frontend/.env.local` (copy the example only if absent). Enter:
   - `VITE_API_BASE_URL=http://127.0.0.1:8000`
   - `VITE_SUPABASE_URL=<Project URL>`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>`
4. Update the existing `backend/.env.local` without overwriting its database URI (copy the example only if absent). Enter the same URL/key as `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Set `SUPABASE_JWT_ISSUER=<Project URL>/auth/v1`, `SUPABASE_JWT_AUDIENCE=authenticated`. Keep Open-Meteo disabled for synthetic facilities. Both .env.local files are ignored by Git; never paste credentials into chat. `npm run dev:full` loads backend/.env.local; Vite loads frontend/.env.local.
5. In **Authentication > URL Configuration**, set Site URL `http://127.0.0.1:5173`. Allow `http://127.0.0.1:5173/auth/callback` and `http://127.0.0.1:5173/auth/reset`. If you actually use localhost instead, also allow the equivalent localhost URLs and consistently use that hostname. Keep email confirmation enabled. Use supported asymmetric JWT signing keys (ES256/RS256); legacy shared-secret signing is not accepted by this backend.
6. Restart `npm run dev:full`. Open `/auth`, sign up and confirm two distinct test accounts using email addresses you control. PKCE confirmation/recovery must be opened in the same browser that requested it. The default email service has sending restrictions/rate limits; configure **Authentication > Email / SMTP Settings** if your recipients cannot receive test emails. Do not disable confirmation to conceal a failed flow.
7. Confirm locally: sign in, open `/cloud`, explicitly import the demo draft into its editor, save, analyze, refresh and reopen the report. No demo holdings are uploaded automatically. Run `.\backend\.venv\Scripts\python.exe backend/scripts/verify_cloud.py` from the repository root; passwords are requested through hidden terminal prompts. This checks two-user API/RLS isolation and idempotency. Verification records remain for a restart/reload check.
8. Tell the assistant only that configuration/migrations are ready (and any non-secret error). It will verify connectivity and resume external persistence, two-user authorization and browser authentication checks. No live-connection claim is made before those checks pass.

Prepared code is locally testable; SQL application and email delivery are still externally unverified.

On 2026-10-09, the requested project dashboard was launched in the system browser. Codex embedded and desktop browser automation both failed to initialize with `failed to write kernel assets: The system cannot find the path specified`. No dashboard action or migration was performed through those tools. The public key and session-pooler configuration were still absent at the last local check. After entering those values, the assistant can run the prepared migration script; there is no need to paste secrets or SQL output containing secrets.

After the initial `backend/scripts/verify_cloud.py` check succeeds, restart `npm run dev:full` and run `backend/scripts/verify_cloud.py --reopen` with the same accounts in the same order. This checks the retained report input hashes and cross-owner denial after restart. Email confirmation/recovery and browser session refresh still need real browser/account verification; mocked/unit tests do not establish those outcomes.

Official references checked during implementation:
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/connecting-to-postgres

## Climate data prerequisites

The supplied 327 facilities and four corridors are synthetic. They cannot be submitted as verified operating locations for live climate risk screening. Supply verified operating coordinates and source evidence before enabling sourced analysis. Future projection files and provider-geography mappings are also absent; those stages remain separate from the imported synthetic demo.

## Projection download and import

The [World Bank CMIP6 collection documentation](https://worldbank.github.io/climateknowledgeportal/docs/collections/cmip6-x0.25.html) supports the specified climate products. The interactive download page returned HTTP 403 to automated access; no downloaded native schema has been inspected or imported.

1. Open https://climateknowledgeportal.worldbank.org/download-data in your browser. Select **CMIP6, 0.25°**, annual climatology and multi-model ensemble.
2. Choose a country or subnational geography for which you have a verified operating-location mapping. There is no defensible default geography from the supplied synthetic facilities; do not use registered-country/HQ as a substitute.
3. Download **hd35** (days/year), historical **1995–2014**, and future **2040–2059** for **SSP2-4.5** and **SSP5-8.5**, ensemble median. Optional tasmax uses °C; optional p10/p90 values represent model spread. Preserve the portal's actual metadata and product terminology.
4. Save the unchanged downloads to `backend/data/projections/incoming/`, together with their download URL/date and chosen geography ID. No filenames or CSV columns are assumed before inspecting actual files. CSV or JSON can use the existing mapping adapter; NetCDF/other layouts require a format-specific adapter after inspection.
5. Prepare a mapping JSON containing `metadata` (collection, geoLevel, variable, unit, scenario, period, product, ensemble, percentile, baseline, sourceURL, downloadedAt), `columns` (normalized field to actual source column), and `geographyMap` (actual source ID to verified provider-geography ID). For nested JSON, include `recordsPath` as a list of object keys. Missing values remain null.
6. Run `.\backend\.venv\Scripts\python.exe backend/scripts/import_projections.py --file <actual-download> --mapping <inspected-mapping.json>`. It validates before storing hash-preserved raw bytes and normalized records, rejects overlapping products, and does not mutate downloads. `/scenarios` → **Future context** queries only verified geography mappings.

Missing provider files/geography keep the UI explicitly unavailable. Fixture-based parser tests are not verification of an actual World Bank download. Open-Meteo connectivity was separately verified with a public ocean coordinate; no supplied company site was relabeled sourced.

See [OPERATIONS.md](OPERATIONS.md) for hosting preparation and optional Gemini configuration. No hosting choice is needed until the local cloud-connected acceptance test is complete.
