# Task 02, Increment 1 implementation report

## A. Files changed

- `frontend/src/state/usePortfolioWorkspace.js`: account-scoped, in-memory private
  portfolio lifecycle; create, list, save, reopen and switch operations.
- `frontend/src/services/live/privatePortfolios.js`: validated request/response
  adapter for the existing private API, reusing holding normalization.
- `frontend/src/state/AppState.jsx`: shared selected portfolio state, dataset
  activation, removal of persistent draft restoration/writes, and legacy cleanup.
- `frontend/src/pages/Portfolio.jsx`: named private portfolios in the existing
  holdings/CSV editor, explicit sample loading and save/load status.
- `frontend/src/App.jsx`: workspace initialization/loading and disabled dataset
  switching during save/open. Existing authentication guards remain intact.
- `frontend/src/components.jsx`: prevent private drafts from going through the
  local demo analysis/history path pending Increment 2.
- `frontend/src/tests/privatePortfolios.test.js` and
  `frontend/e2e/private-portfolios.spec.js`: contract validation and browser checks.
- Existing E2E helpers/specs: mock account-owned portfolio lists, explicitly select
  sample holdings and navigate within the SPA. Actual browser reload still starts
  empty. No production authentication bypass was added.
- `docs/SUPABASE_VERIFICATION.md`: live acceptance procedure and increment boundary.

Prior uncommitted authentication work remains present. No backend, migration,
dataset, weather/projection or simulation mathematics were changed.

## B. Verified API contracts

The existing authenticated GET `/api/v1/private/portfolios` returns schemaVersion
`1.0.0` and an owner-scoped `portfolios` array. POST to that same endpoint explicitly
calls the existing create/update RPC. Its body contains only UUID `id`, name,
holdings and scenario. Ownership comes from validated JWT/RLS. The response
contains an authoritative portfolio row with dataset_version, updated_at and a
draft containing holdings/scenario. There is no GET by portfolio ID, so reopening
refreshes the owner-scoped list. Existing DELETE stays in Cloud.

The API requires a 1–200 character name and 1–1,000 holdings. Empty drafts are
supported in the editor but cannot be saved. Scenario is saved with the portfolio.

## C–E. State, functionality and security

Shared state exposes activePortfolioId/name, holdings, scenario, dirty flag,
save/open/list progress, errors and lastSavedAt. New drafts have a UUID; editing
and saving retain that identity. Saved server values replace the draft only after
validation and confirmation. Saved rows are never silently selected.

Name/holdings/scenario edits mark unsaved state. Existing INR validation, company
IDs, amount precision, CSV matching, exclusions and duplicate merging are reused.
Busy operations prevent duplicate writes and editing. A failed save or open retains
the previous draft. Dirty replacements require confirmation. Dataset/version and
holding ownership inconsistencies are rejected before state replacement.

Drafts and portfolio lists are React memory only. Legacy browser draft keys are
removed. Logout, expiry or account change clears state; session and operation
generations reject delayed responses. No browser-supplied ownership field or
service-role key was introduced. Authentication remains mandatory.

## F–G. Verification and manual acceptance

Final verification on 2026-10-10:

- `npm run test --workspace frontend`: 29 passed.
- `npm run test:e2e --workspace frontend`: 58 passed, desktop and mobile;
  includes 14 focused private portfolio checks.
- From `backend`, `.venv/Scripts/python.exe -m pytest tests/test_private_api.py -q`:
  2 passed. No live Supabase connection is exercised by these tests.
- `npm run build`: passed; existing large-bundle/dependency annotation warnings remain.
- `git diff --check`: passed.
- Frontend `http://127.0.0.1:5173`: HTTP 200; backend
  `http://127.0.0.1:8000/health`: status ok. Restart both with `npm run dev:full`.

Browser private
portfolio and authentication checks use network mocks against the real SDK/UI;
synthetic workflow checks use the actual local FastAPI analytical endpoints.
These do not prove live Supabase acceptance.

Frontend localhost and backend health were checked successfully. The existing
private API contract tests were run because the frontend relies on the verified
POST/create-update contract. A live User A/User B acceptance run was not performed:
no two controlled, usable account credentials were supplied for this increment.
Signup confirmation, password reset, real saves/reopens and owner isolation remain
the manual checklist in SUPABASE_VERIFICATION.md. Enter passwords only in the app.

## H. Remaining Increment 2

Integrate saved private portfolio analysis into the main workspace; accept the
private results, comparison, reopening and export workflow without storing private
snapshots in local demo history. For now private drafts cannot use the local demo
Run button. Explicit synthetic samples still exercise the unchanged engine and
existing Cloud private analysis remains functional. Increment 2 was not started.
