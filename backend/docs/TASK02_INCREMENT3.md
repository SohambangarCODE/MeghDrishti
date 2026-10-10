# Task 02, Increment 3 — Private comparison and workspace consolidation

Signed-in users can open a saved report in Reports, follow **Compare this snapshot**, and compare a hypothetical allocation in the normal Compare page. Private data remains in the session workspace; comparison does not update the saved portfolio or report. Local demo comparison remains available.

## Files changed

- `frontend/src/services/live/privateCompare.js` (new): validates transfers and private comparison responses against the selected immutable snapshot.
- `frontend/src/state/AppState.jsx`: selects the private authenticated comparison endpoint, checks session ownership after requests, and clears associated active reports after confirmed portfolio deletion.
- `frontend/src/state/usePortfolioWorkspace.js`: owner-scoped portfolio deletion, confirmation of server response, draft retention on failures, and session/request guards.
- `frontend/src/pages/Compare.jsx`: private/local snapshot selection, stable baseline URLs, progress/errors, hypothetical private comparisons without applying them to the draft.
- `frontend/src/pages/Portfolio.jsx`: explicit portfolio-and-report deletion confirmation, progress and errors.
- `frontend/src/pages/Results.jsx` and `WorkspacePages.jsx`: links preserve the intended baseline and open private Results in the main workspace.
- `frontend/src/App.jsx`, `components/AuthNavigation.jsx`, `pages/Auth.jsx`: consolidated navigation; protected legacy `/cloud` redirects to Reports.
- `frontend/src/components.jsx`: analysis waits during portfolio deletion.
- `frontend/src/tests/privateCompare.test.js` (new), `frontend/e2e/private-analysis.spec.js`, `frontend/e2e/auth.spec.js`: comparison, immutability, deletion, navigation, and session regression checks.
- `backend/docs/SUPABASE_VERIFICATION.md`: updated manual workflow.
- Removed `frontend/src/pages/Cloud.jsx` and `frontend/src/components/PrivateComparison.jsx` after migrating their capabilities and checking active references.

These changes build on the existing Increment 2 implementation. Backend APIs, Python calculations, migrations, datasets, weather integrations, and authentication/RLS rules were not changed.

## Verified API contract

Private comparison calls authenticated `POST /api/v1/private/compare` with exactly:

```json
{
  "runId": "saved-private-run-uuid",
  "fromCompanyId": "matched-source-company-id",
  "toCompanyId": "matched-target-company-id",
  "amount": 1000000,
  "requestId": "unique-request-uuid"
}
```

The existing backend retrieves the saved run under the authenticated owner, validates distinct matched holdings and a positive finite transfer within source capital, and calculates without writing to the portfolio or run. The response contains `schemaVersion`, `requestId`, `baselineRunId`, `fixedInputHash`, `baseline`, `proposed`, and `transfer`. `proposed` is an analysis result without a new saved-run identity; the frontend validates that shape rather than fabricating an ID.

The adapter verifies baseline ownership/identity, request identity, unchanged baseline holdings/input hash, unchanged source/scenario/event snapshots in both results, unchanged total capital, and the exact INR transfer. Model parameters live in those fixed snapshots. Transfer failures are shown in Compare. A missing explicit baseline URL does not silently choose a different run. Changing baselines clears the previous proposed result; late responses cannot enter a new session.

## Cloud capability parity

| Capability | Main workspace destination |
| --- | --- |
| List, create, save, open, edit portfolios | Portfolio / My Portfolios |
| Explicit samples and CSV review | Existing Portfolio editor |
| Delete portfolio with dependent reports | Portfolio, explicit confirmation and server success required |
| Run a saved private analysis | Analyze saved portfolio |
| List, reopen and delete private reports | Reports; deletion requires confirmation |
| Inspect private snapshot | Results, Graph and Overview through in-memory active run |
| Export JSON/CSV | Results |
| Hypothetical private allocation comparison | Compare |
| Authorization/API errors | Existing guarded requests and page notices |

Portfolio deletion clears its current draft and associated active report only after server confirmation. Unrelated drafts remain intact. Failures retain the draft and advise refreshing the list because a lost response cannot prove server state. Private reports are never saved to local demo history. Logout/session expiry still clears the private workspace.

The Cloud navigation entry and obsolete implementations are removed. `/cloud` remains protected and redirects to `/reports`. After reload, reopen the private report from Reports before using its Results/Compare URL.

## Live verification

On 2026-10-10, the already signed-in browser reopened the previously saved synthetic imported-data sample from Reports and ran one actual authenticated comparison. A hypothetical INR 1,000,000 transfer from AbbVie to CVS preserved total capital at INR 10,000,000. Assumed weighted exposure changed from INR 473,532.89 to INR 431,738.69. The private Compare page showed no Apply-to-draft action. Its response passed the immutable snapshot checks above.

The sample uses real company identities and dataset-reported relationships with explicitly synthetic operational assumptions. These amounts are assumed stress-weighted exposure, not predictions of financial loss. No existing live portfolio/report was edited or deleted during this increment.

Live two-account RLS isolation, email confirmation/recovery, explicit logout/login, and token-refresh acceptance remain outstanding. Network mocks cover session transitions and failure handling but do not establish live Supabase isolation. Follow `SUPABASE_VERIFICATION.md` for those checks.

## Automated verification

Final verification on 2026-10-10:

- `npm run test --workspace frontend`: 35 unit tests passed.
- `npm run test:e2e --workspace frontend`: all 66 desktop/mobile browser tests passed (3.1 minutes).
- From `backend`, `.venv/Scripts/python.exe -m pytest tests/test_private_api.py -q`: 2 tests passed, with an existing Starlette test-client deprecation warning. These tests mock persistence and are not live RLS proof.
- `npm run build`: passed, with existing dependency annotation and bundle-size warnings.
- `git diff --check`: passed.

The first complete browser run passed 65 of 66 checks; the desktop deletion check coincided with a development-server reload during a source edit. The final full rerun with source files unchanged passed all checks. No retries were enabled to hide that failure.

This increment introduces no broader dataset, map, weather, climate projection, or design work. No Git commit was created.
