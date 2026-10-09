# Live Supabase verification

Run commands in PowerShell from the repository root. Use a development project
and two distinct email accounts you control. This runbook describes checks to
perform; mocked browser tests do not establish live acceptance.

## 1. Apply or confirm migrations

In Supabase Dashboard, select the intended project, then open SQL Editor.
For a fresh project, open each local file with the following commands, copy its
complete contents into SQL Editor, and click Run, in this order:

```powershell
Get-Content -Raw supabase/migrations/202610090001_initial.sql
Get-Content -Raw supabase/migrations/202610090002_private_workflows.sql
```

Do not reapply the initial migration to existing tables. For an already configured
project, inspect the migration ledger first:

```sql
select * from public.app_migrations;
```

Confirm both versions are recorded. If the initial schema exists but the ledger
does not, inspect the schema and apply only the missing second migration. Do not
reset the database. Dashboard SQL Editor is sufficient; a CLI is not required.

## 2. Configure local environments

Update existing files without discarding other settings. Substitute actual project
values locally; do not commit or share these files.

`frontend/.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-project-publishable-key
VITE_API_BASE_URL=http://127.0.0.1:8000
```

`backend/.env.local`:

```dotenv
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-project-publishable-key
SUPABASE_JWT_ISSUER=https://your-project-ref.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated
DATABASE_URL=postgresql://your-database-user:your-url-encoded-password@your-pooler-host:5432/postgres?sslmode=require
ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

Copy the actual database connection details from Connect > Session pooler; do not
guess the host/user. Percent-encode reserved password characters. DATABASE_URL is
for administrative setup scripts, not browser or runtime API access. Browser
variables must contain only the public URL/publishable key, never a service-role
key or database password. The backend verifies asymmetric ES256/RS256 JWTs.

In Authentication > URL Configuration set Site URL to `http://127.0.0.1:5173` and
allow both `http://127.0.0.1:5173/auth/callback` and
`http://127.0.0.1:5173/auth/reset`. Keep this hostname consistent throughout.
Enable email confirmation and configure email delivery/SMTP as needed.

Restart the services so both environment files are loaded:

```powershell
npm run dev:full
```

## 3. Browser acceptance checklist

- [ ] Open `http://127.0.0.1:5173/auth`; the Sign in form is enabled.
- [ ] Sign up account A. Receive the confirmation email and open it in the same
      browser that requested it (PKCE). Repeat for distinct account B.
- [ ] Sign in with A; the UI shows its email. An incorrect password shows an error.
- [ ] Request password reset, receive/open the recovery link in the requesting
      browser, set a new password, then sign in with it.
- [ ] Reload while signed in. Confirm the session restores. Leave the session
      through its token expiry, then confirm refresh succeeds and a private request
      still succeeds; do not copy tokens into logs or screenshots.
- [ ] Select a dataset and prepare a demo portfolio. Open `/cloud`, click
      **Import current demo draft into editor**, name it, then **Save private
      portfolio**. Saving is explicit; signing in alone must not upload holdings.
- [ ] Click **Analyze last cloud-saved portfolio**. Check its result and recorded
      source/scenario versions. Unsaved editor edits must not affect this result.
- [ ] Under Private saved reports click **Open [timestamp]**. Confirm the message
      “Report loaded into main workspace.” Follow the private Graph and Overview
      links. Their values and entities must match this report, even if the demo
      dataset differs. The private report is held in memory only.
- [ ] Return to `/cloud` using in-app navigation. Compare with **Compare private
      transfer**; verify total capital is preserved and the baseline stays fixed.
- [ ] Export JSON/CSV from the private result; inspect values, source labels and
      snapshot versions. Export is an explicit download, not browser history.
- [ ] In browser storage, confirm `meghdrishti:runs:v1` and demo draft entries do
      not contain the private report ID or private edits. Supabase's auth session
      storage is expected; report snapshots are not.
- [ ] Reload the page: the in-memory active report clears. Reopen it from `/cloud`.
- [ ] Sign out. Graph and Overview fall back to anonymous demo state, `/cloud`
      requires sign-in, and private selections/details disappear. Sign in with B:
      A's report must not appear. Anonymous demo analysis must still work.
- [ ] With a report active, verify rejected/expired-session handling also clears
      it. For a deterministic UI-only check in DevTools, dispatch the existing
      event below; this is not proof of real token expiry:

```javascript
window.dispatchEvent(new Event('meghdrishti:session-expired'))
```

## 4. Two-account API/RLS and restart proof

Keep the services running. In a second terminal at the repository root:

```powershell
backend/.venv/Scripts/python.exe scripts/verify_cloud.py
```

Enter confirmed accounts A and B in order. Password prompts are hidden. The script
creates retained verification records, checks owner access, rejects cross-owner
operations and checks idempotency. It writes IDs/hashes, not passwords or tokens,
to `artifacts/cloud-verification.json`. Keep this file and those records for the
restart check. A failure is a blocker to live acceptance; retain the non-secret
error and do not report success.

In the terminal running `npm run dev:full`, press Ctrl+C to stop both services,
then restart them:

```powershell
npm run dev:full
```

Once both are ready, in the second terminal run:

```powershell
backend/.venv/Scripts/python.exe scripts/verify_cloud.py --reopen
```

Use the same two accounts in the same order. Expect identical retained input
hashes and cross-owner denial. Reopen the report in the browser as well. Record
the date, commands, pass/fail output and manual checklist results without secrets.
The script checks API/RLS persistence; email, refresh and UI behavior require the
manual checklist above. Delete verification records only after completing it.


## Authentication navigation increment

Ordinary login opens `/overview`. Direct unauthenticated `/cloud` access returns
there after login through an allowlisted destination. Authenticated `/auth` visits
open Overview; `/auth/reset` remains available to finish recovery. Use the header
Sign out action. Logout is local to this browser session, not a promise of token
revocation on all devices. Cleanup errors expose a retry action.

Check Get Started and Open anonymous demo separately. Authentication remains
accessible when the dataset API fails. Cloud empty states explain explicit import
and save. Private pages remount for each session generation and old private API
responses are rejected. Private React Query keys must begin with `private` so
cleanup cancels/removes them without deleting anonymous demo state.

Mocked tests verify navigation, callback established-session/error behavior,
recovery UI, restoration, logout/expiry and delayed responses. They do not prove
live email delivery or the complete PKCE email exchange. Run the real-account
checklist above before declaring live acceptance. Create-from-empty and add/remove
holdings in the private editor remain the next increment.
