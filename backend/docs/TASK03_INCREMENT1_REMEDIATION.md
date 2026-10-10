# Task 03 Increment 1 regression remediation

## Root causes and evidence

Both private coverage failures had the same test-counter timing defect. Switching datasets calls `usePortfolioWorkspace.switchDataset`, which loads and activates a fixture. Changing AppState's selected dataset ID also triggers its existing repository load. Each returned dataset has a different object identity, so CoverageTable's effect can issue another installed-dataset coverage request. The original tests started counting after the first table appeared, while Evidence was still in the installed-dataset context. They could count that second legitimate request before navigating to Reports and opening the private report.

A controlled delayed second fixture load reproduced the request after the original counting boundary. It was `GET /api/v1/datasets/coverage?datasetId=climateweb%3Ademo-operational-v1-commercial-v1-resolved-v2`, with a null body, while the table explicitly displayed “Selected installed dataset.” No private run had been opened. This was neither a private snapshot upload nor a stale private response.

The authentication failure was an application timing bug, not an outdated success-message expectation or a Supabase mock mismatch. App's special no-dataset Auth branch and its normal Routes branch mounted different Auth component instances. When the initial dataset arrived during signup, the old instance was unmounted. The new instance had empty inputs, Sign in mode and no success notice. Holding dataset responses until a mocked signup began reproduced the missing notice reliably. Before the app fix, the strengthened desktop focused run yielded two coverage passes and one authentication failure at the reported success-message assertion.

## Minimal corrections

- `frontend/src/App.jsx`: render Auth through the same Routes tree before and after initial dataset loading; retain the loading gate for non-auth pages and tolerate a missing dataset version in the header. Auth remains accessible when dataset loading fails. PrivateRoute and session initialization are unchanged.
- `frontend/e2e/auth.spec.js`: add a signup mock gate and finish dataset loading while signup is pending. Assert the original success notice, retained email, exactly one signup, no unexpected auth requests, and no Portfolio heading or workspace navigation during a held PKCE exchange.
- `frontend/e2e/coverage.spec.js`: record requests from the start, force the delayed second installed load, and distinguish installed versus private-active phases. Assert zero public requests throughout private Evidence and logout, not zero requests during the earlier installed-dataset page. Assert that all recorded pre-private requests use GET, have no body, have only the datasetId parameter, use an installed version and contain no private company marker or run ID. Retain the immutable six-company snapshot/hash, mismatched installed selector, logout/account-switch and localStorage checks.
- `backend/docs/TASK03_INCREMENT1.md`: clarify the private-active request boundary and link this report.

CoverageTable, coverage services, Evidence, AppState and authentication session logic were inspected and required no changes. The existing cleanup aborts installed requests, rejects results from obsolete effect instances and gates displayed coverage by source, private-run identity and session generation. Private coverage uses only the immutable sourceSnapshot in memory. Missing structural source data fails explicitly instead of substituting the installed dataset. No private coverage cache or persistence was added.

## Verification

Completed final verification on 2026-10-10:

| Check | Command | Result |
| --- | --- | --- |
| Initial three affected tests | `npm run test:e2e --workspace frontend -- e2e/coverage.spec.js e2e/auth.spec.js --grep 'private immutable coverage\|protected route waits'` | 6 passed across desktop/mobile; ordinary timing did not reproduce the intermittent failures. |
| Controlled reproduction before the app fix | Same focused command with `--project desktop`, after adding the delayed-loading fixtures | 2 coverage tests passed; the authentication test failed at the original signup-success assertion, confirming the remount defect. |
| Final three affected tests | Focused command above with the final delayed-loading assertions | **6 passed**, 31.8 seconds, no retries. |
| Frontend unit tests | `npm run test --workspace frontend` | **41 passed** across 6 test files. |
| Complete browser regression suite | `npm run test:e2e --workspace frontend` | **74 passed**, desktop/mobile, 6.0 minutes, no retries. |
| Production build | `npm run build --workspace frontend` | **Passed**, 976 modules, 15.38 seconds. Existing Zod annotation and bundle-size warnings remain. |
| Whitespace validation | `git diff --check` | **Passed**; Git emits existing LF/CRLF conversion notices. |

No backend code changed in this remediation, so backend tests were not rerun. The previously reported 55 backend passes are not presented as a new verification result. Exploratory full-suite runs stopped before final edits are excluded from the completed regression result.

Verified privacy/authentication behavior: zero public coverage calls from private-active Evidence through logout; immutable snapshot totals and content hash despite a different installed dataset selection; no private marker/run persisted in localStorage; private coverage absent after logout and another login/account change; installed coverage restored separately; unresolved PKCE session displays only restoration status without Portfolio content or workspace navigation. Existing late private-response, session-expiry, owner-switch, report reopen/export and comparison regressions also passed in the complete suite.

## Boundaries and limitations

No backend APIs, simulation mathematics, datasets, migrations, JWT verification, RLS, private portfolio/comparison contracts or integrations changed. Browser authentication uses mocked Supabase responses; this does not verify live email delivery, real account credentials or two-account database RLS. The existing duplicate installed-dataset loading remains; removing it would be an unrelated state-management change. No Task 03 Increment 2 work was started.
