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


## Task 01: mandatory authenticated workspace

Landing and authentication/callback/reset are public. All normal working pages
(Overview, Portfolio, Graph, Locations, Scenarios, Results, Compare, Evidence,
Reports and Cloud) now require a Supabase session. Get Started opens login for
signed-out visitors and Overview for signed-in visitors. Synthetic simulation
remains available after login. There is no anonymous workspace entry.

A shared guard waits for session initialization before rendering the workspace.
Login preserves result IDs and approved graph/map/comparison query parameters;
unsafe, unknown or credential-bearing destinations fall back to Overview.
Logout removes the workspace and directs visitors to the authentication gateway.
Tests use network-only Supabase mocks; real email and two-account acceptance
remain separate checks above.

Backend security follow-up: `backend/app/auth.py:identity` still accepts the legacy
`X-Demo-Session` header for analytical demo APIs. Mandatory browser routing does
not remove this backend capability. Private APIs independently require validated
JWTs and owner RLS. Removing or gating anonymous analytical APIs is a separate
backend task; no backend authorization or migration was changed in Task 01.

Earlier anonymous-entry instructions in this document are superseded by Task 01.

Task 01 follow-up verification (2026-10-10): imported-data workflow and point-weather tests passed on desktop/mobile (4 tests). Climate evidence/overlay and corridor map-to-graph/scenario tests also passed on desktop/mobile (4 tests), after adapting their login expectations and corridor selector. These use mocked Supabase login with actual local analytical APIs. No live-account acceptance is implied.

## Task 02, Increment 1: main private Portfolio editor

The main `/portfolio` editor now starts empty after login or browser refresh.
My Portfolios lists account-owned records but does not automatically open one.
Drafts stay in React memory. Legacy `meghdrishti:draft:*` browser drafts are
removed and never restored. Logout, session expiry and account changes clear
the draft, selection, errors and list; responses from older sessions are ignored.

Use Create Portfolio, enter Portfolio Name, search supported companies and add
holdings. Amounts remain INR; CSV review, duplicate merging, exclusions and
removal use the existing editor. Save Portfolio shows progress and prevents
duplicate submissions. Failed saves/opens retain current edits. Opening another
portfolio, creating one, changing dataset or loading a sample requires discard
confirmation when the draft is dirty. A successful save uses the server response
and keeps the same UUID for later updates. Opening also selects the saved dataset.

Verified existing API contracts (no backend or migration changes):

- `GET /api/v1/private/portfolios` returns
  `{ "schemaVersion": "1.0.0", "portfolios": [...] }`.
- `POST /api/v1/private/portfolios` explicitly supports create/update through
  `save_portfolio`; send `{ "id": "uuid", "name": "portfolio name",
  "holdings": [...], "scenario": {...} }`. Never send an owner identifier.
- The response is `{ "schemaVersion": "1.0.0", "portfolio": {...} }` with
  `id`, `name`, `dataset_version`, `updated_at` and
  `draft: { holdings, scenario }`. Holdings have the saved UUID in `portfolioId`.
- There is no single-portfolio GET. Open refreshes the authenticated list and
  selects the intended UUID. Responses and dataset/company references are validated.
- The existing API accepts 1–1,000 holdings and names of 1–200 characters.
  Empty drafts can be edited but cannot be saved. Scenario belongs to the portfolio.
- Existing DELETE remains on the Cloud page; this increment adds no delete control.

### Live manual acceptance — not yet verified

Start `npm run dev:full` from the repository root after completing the environment
and migrations above. Use two email accounts you control; enter passwords only
in the app. This increment's browser automation mocks authentication and private
API responses, so it does not prove live persistence or owner isolation.

- [ ] Sign in as User A; open `/portfolio` and confirm no fictional holdings appear.
- [ ] Create `Test Portfolio A`, add supported holdings and save. Record its UUID.
- [ ] Edit an amount and save; confirm the UUID stays the same and the list contains
      one updated record rather than a duplicate.
- [ ] Refresh; confirm an empty draft, then explicitly open the saved portfolio.
- [ ] Make an unsaved edit and cancel opening another portfolio; confirm it remains.
- [ ] Start another portfolio; confirm a new UUID and that the previous record remains.
- [ ] Sign out, sign in again and explicitly reopen the saved holdings.
- [ ] Sign in as User B; confirm User A's record is absent and inaccessible through
      the private API. Use the two-account RLS verification commands above as well.
- [ ] Click Load sample portfolio explicitly. Confirm synthetic provenance and no
      automatic save; confirm cancelling discard retains private edits.

### Increment 2 boundary

Main-workspace private analysis has not been integrated or accepted in this
increment. Its Run synthetic analysis button is disabled for private drafts so
private holdings cannot be written into the existing local demo report history.
Explicit sample mode still uses the unchanged synthetic engine. Existing Cloud
private analysis remains available. Increment 2 must integrate saved private
portfolio analysis, private results/comparison/export and reopen behavior without
persisting private snapshots in local browser history. Weather, projections,
datasets and simulation mathematics were not changed here.

## Task 02, Increment 2: private analysis and reports

This supersedes the Increment 1 analysis restriction above. Save or explicitly
open a private portfolio, then click **Analyze saved portfolio**. Unsaved changes
must be saved first. Analysis calls the existing authenticated private API, which
reads the saved draft and persists the computed snapshot. Only explicit sample
mode uses the existing local demo analytical service/history.

Reports now lists **Private cloud reports** above local demo reports. Open retrieves
the snapshot from the owner-scoped private endpoint and displays Results. Delete
requires explicit confirmation and removes the row only after server success.
Private Results supports JSON/CSV export but has no save-to-local-history action.
The history service independently rejects private snapshots. Logout clears the
active private snapshot and removes the private report list from view.

Live check performed on 2026-10-10 using the already signed-in browser account:

- Saved `Task 02 verification — synthetic sample` with the imported dataset's
  explicit sample holdings; it remains in the account for inspection.
- Ran Analyze saved portfolio; private Results displayed assumed weighted exposure
  of INR 473,532.89, matching the imported fixture expectation.
- Navigated to Reports, reloaded the browser and reopened the persisted private
  report successfully. The local demo archive displayed zero snapshots.
- No credentials were read, entered or committed. No existing portfolio was
  overwritten, and the verification record was not deleted.

This proves one-account live save/analyze/list/reopen and browser session
restoration, not live two-account isolation, explicit logout/login, password reset
or token refresh. Those live checks remain the checklist above. Automated network
mocks additionally exercise logout, delayed requests, failed open, confirmed
deletion and private export. Direct result links after reload require opening the
private snapshot from Reports first.

Increment 3 remains: integrate private comparison into the main Compare page and
complete feature parity before removing Cloud. Private Results currently directs
comparison to the existing Cloud page. No migrations or backend APIs changed.

Final automated verification on 2026-10-10: `npm run test --workspace frontend`
passed 33 unit tests; `npm run test:e2e --workspace frontend` passed all 62 desktop
and mobile checks; `npm run build` passed with the existing bundle-size warnings;
`git diff --check` passed. Private API/authentication mocks do not substitute for
the live two-account/email checklist.
