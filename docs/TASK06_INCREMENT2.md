# Task 06 Increment 2 — Gemini assessment

## Implementation

Results includes **Generate AI Assessment**. It sends only the completed run ID to the
backend. Private runs use the existing bearer-authenticated private API, which reads
the RLS-protected immutable report and checks its owner before calling Gemini. Demo
runs use the existing session capability and server-held completed run. A browser-only
or expired server run cannot be assessed and produces a useful error.

The assessment is held in React memory only. It does not update the run, write a
Supabase record, enter localStorage or change exports. Session generation, owner and
run checks discard delayed responses after logout/account changes. Navigating away
discards the assessment. Original calculations, deterministic explanations and exports
remain available on provider errors.

## A. Files changed

- `backend/app/config.py`: local environment loading without logging values or
  overriding deployed environment variables.
- `scripts/dev.mjs`: excludes `GEMINI_API_KEY` from the Vite child environment.
- `backend/app/main.py`: load backend environment before dependent services; demo
  assessment endpoint.
- `backend/app/private_api.py`: authenticated read-only private assessment endpoint.
- `backend/app/assessments.py`: grounded fact preparation, structured Gemini REST
  call, response validation, bounded timeout and sanitized errors.
- `backend/tests/test_assessments.py`: provider failure, grounding, owner and snapshot tests.
- `frontend/src/state/AppState.jsx`: assessment requests and session/run checks.
- `frontend/src/services/live/FastApiSimulationService.js`: configurable per-request
  timeout; existing requests keep their previous default.
- `frontend/src/components/AiAssessment.jsx`: small existing-style action and sections.
- `frontend/src/pages/Results.jsx`: render that component.
- `frontend/e2e/assessment.spec.js`: authenticated Results, failure/retry and logout tests.
- This report.

No environment credentials, migrations, datasets, engine formulas, maps or graphs
were edited. No Git operations were performed.

## B. Actual connection and C. Model

The configured backend `GEMINI_API_KEY` was loaded successfully, confirmed as a boolean
only. An actual `generateContent` request for the fictional reference analysis returned
`status: available`, the correct run ID and six validated sections using
**gemini-2.5-flash**. The key was sent only in the backend provider request header,
never in a URL or frontend payload. No provider error bodies or secrets are logged.

The existing lightweight `httpx` REST approach was reused. Google's
[structured-output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en)
supports this model and response JSON schemas. No SDK or orchestration dependencies
were added. `GEMINI_ASSESSMENT_MODEL`, then existing `GEMINI_MODEL`, can override the
default. The assessment uses the configured key without requiring the legacy
`GEMINI_ENABLED` path-selection feature flag.

A second live check exercised the running HTTP workflow: create the reference analysis
with the demo capability → POST its assessment endpoint → receive HTTP 200 `available`,
the matching run ID and all six sections → reopen the run and compare the complete
snapshot for equality. Original modeled exposure remained INR 1,334,340.00. Both requests
used the configured key server-side; no real private portfolio was sent for verification.

From the project root, `npm run dev:full` loads `backend/.env.local`. Direct uvicorn
startup now loads it too. Production environment variables take precedence. Required:

```dotenv
GEMINI_API_KEY=your-server-side-key
# Optional:
GEMINI_ASSESSMENT_MODEL=gemini-2.5-flash
```

Never use a `VITE_` prefix for this key. Restart the backend after setting it.

## D. Authorization

- `POST /api/v1/private/runs/{run_id}/assessment`: same `authenticated` dependency
  and user-JWT Supabase store as existing private run retrieval. No JWT or RLS changes.
- `POST /api/v1/runs/{run_id}/assessment`: same existing demo/authenticated run-owner
  lookup as explanations. It cannot access another session's run or private cloud data.
- Private reports use the private endpoint, not a posted snapshot or public dataset API.
- Reads are immutable; no database writes, current-data substitution or climate retrieval.

## E. Assessment schema and grounding

The JSON envelope contains `schemaVersion`, `runId`, `provider`, `model`, `status`,
`disclosure`, `sections` and, on success, `inputHash`. Sections have `id`, `title`, and
`statements` with `factId` and `text`. The six sections are:

1. Executive summary
2. Principal modeled risk drivers
3. Supply-chain disruption
4. Climate context and availability
5. Evidence gaps and uncertainty
6. Practical risk-reduction considerations

Gemini receives the saved scenario, modeled hazards, significant holding allocations,
baseline totals, selected propagation paths, snapshot evidence indicators and available
fact choices. It receives no account ID, email, token, key, entire source dataset,
operational coordinates or quarantined climate values. Source coverage is calculated
locally from the immutable source snapshot; insufficient snapshot data stays unavailable.

To guarantee numerical grounding under the deadline, Gemini returns **section-specific
fact IDs**, ordered by relevance. It cannot author arbitrary numbers, locations or loss
claims. The backend validates all six sections, allowed IDs, distinctness, list bounds
and completion status, then renders sentences from the original engine facts and fixed
interpretation templates. This is AI prioritization with grounded narration, not free-form
AI research. No p10/p90 values, risk percentages or new financial formulas are generated.

Unattached weather and World Bank context are explicitly unavailable. No automatic
current weather fetch occurs for historical reports. No quarantined projections enter
the provider prompt or returned assessment.

## F. Results behavior and errors

The action discloses sending the selected analysis to Google. Loading disables repeat
clicks; completed sections use existing styles. The component displays missing-key,
quota/rate-limit, credentials, unavailable-model, timeout, network/service and invalid
response notices. The backend uses a 22-second total request deadline, a 20-second
HTTP timeout and a 5-second connection timeout. There are no automatic retries or
background AI requests. Demo frontend timeout is 25 seconds for this request; private
requests retain the existing 30-second timeout.

## G. Verification

Actual Gemini request: **passed**, correct reference run identity, six validated sections.

Focused backend assessment/auth/private/explanation tests: **17 passed**.
Full backend suite: **98 passed**, including unchanged simulation/parity and private tests.
Frontend unit suite: **66 passed** across 9 files.

The initial browser fixture omitted required `portfolio_id` in the private report list.
The UI correctly rejected it. The fixture was corrected without relaxing validation.
An intermediate browser attempt ran while the supervised development service was
restarting, producing connection-refused failures. Both services were restored before
the final clean rerun. No assertions were relaxed.

Final combined browser command:

```powershell
npm run test:e2e --workspace frontend -- assessment.spec.js auth.spec.js private-analysis.spec.js
```

**40 passed in 2.2 minutes**, 20 desktop and 20 mobile. The new assessment suite accounts
for six checks; the other 34 cover authentication, protected initialization, logout,
expiry, account switching, delayed private responses, private analysis/reopen/compare/
export and deletion. No failures remain in the final run. The separately rerun assessment
suite also passed all six tests. The complete unrelated browser suite was not rerun.

The final full backend rerun after adding immutable evidence indicators and the service
status update passed **98 tests in 15.94 seconds**. `node --check scripts/dev.mjs` passed.

Production build: **passed**, 982 modules, 14.32 seconds. Existing Zod annotation and
large-chunk warnings remain. A direct scan of all generated frontend files verified
that the actual configured Gemini key is absent. The key value was not printed.

Both `http://127.0.0.1:5173` and backend `http://127.0.0.1:8000/health` return HTTP 200.
The backend has been restarted with the assessment endpoints and local environment
loader. Vite is running. Future startup can use the unchanged `npm run dev:full` command.

## H. Limits and I. Demo status

- Gemini availability depends on the configured account's quotas/network/model access.
  Failures leave Results functional; they are not silently presented as successful AI.
- Assessments are generated on demand, not saved/exported with immutable reports.
- Gemini selects and prioritizes facts rather than generating unbounded prose.
- Weather and World Bank context remain unavailable where not legitimately attached.
- Real Supabase account acceptance is not newly claimed; authorization is exercised
  with existing backend dependency and browser network mocks.

Demonstration: **READY for this increment's Gemini assessment workflow**. Live provider
and localhost endpoint requests succeeded, required tests/build passed, and both local
services are running. This does not upgrade missing weather/projection evidence or
claim a new live two-account Supabase acceptance verification.

To present: sign in → open an existing private report from Reports (or run the sample
demo analysis) → Results → **Generate AI Assessment** → inspect the six sections.
Do not label modeled exposure as projected investment loss.

Stop after Task 06 Increment 2. Task 07 is not started.
