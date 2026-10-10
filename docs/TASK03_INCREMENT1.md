# Task 03, Increment 1: read-only evidence completeness

The Evidence page now separates dataset-reported identity/topology, synthetic sites/routes, assumed parameters and missing real evidence. It displays counts, explicit denominators, percentages, metric definitions, snapshot version and a deterministic content hash. Empty populations show Not applicable. No visual redesign was made.

## Files changed in this increment

- `backend/app/coverage.py`: pure, validating completeness aggregation and deterministic snapshot hashing.
- `backend/app/main.py`: public installed-dataset coverage endpoint only.
- `shared/coverage-metrics.json`: shared metric IDs, populations, labels and definitions.
- `frontend/src/services/coverage.js`: matching pure in-memory adapter, validated response contract and installed-ID API request helper.
- `frontend/src/components/CoverageTable.jsx`: small accessible Evidence table, unavailable/loading notices and dataset/session request guards.
- `frontend/src/pages/WorkspacePages.jsx`: Evidence chooses the active private source snapshot explicitly, otherwise the selected dataset. Its sources/gap text now describes the same snapshot and avoids blanket assumptions about every record.
- `backend/tests/test_coverage.py`, `backend/tests/fixtures/coverage-cases.json`, `frontend/src/tests/coverage.test.js`, `frontend/e2e/coverage.spec.js`: shared-case parity, count/evidence criteria, immutability, endpoint boundaries, UI selection and private session isolation.

Existing Task 02 changes were retained. No simulation formula, source/normalized dataset, importer, migration, authentication, Supabase/private API, map, graph or projection/weather integration was changed. No commit or deployment was made.

## Public API contract and privacy boundary

```http
GET /api/v1/datasets/coverage?datasetId=climateweb
```

The identifier is mandatory and must resolve through the installed demo repository. Installed version strings and `reference` are also supported. Unknown/empty IDs, duplicate parameters, additional query parameters and any GET body return the existing 422 error envelope. POST is not implemented (405). This endpoint has no snapshot-upload mechanism, accesses no private repository and returns no private holdings or reports. The frontend helper likewise rejects objects before any request.

Response:

```json
{
  "schemaVersion": "1.0.0",
  "status": "available",
  "datasetVersion": "installed-version",
  "contentHash": "64-character SHA-256 digest",
  "hashAlgorithm": "coverage-canonical-v1-sha256",
  "counts": {
    "companies": 215,
    "commercialEdges": 350,
    "facilities": 327,
    "routes": 4,
    "routeUsage": 215,
    "regions": 4
  },
  "metrics": [
    {
      "id": "sourcedCoordinates",
      "label": "Companies with sourced operating coordinates",
      "numerator": 0,
      "denominator": 215,
      "population": "companies",
      "unit": "records",
      "provenanceScope": "Sourced evidence",
      "definition": "Non-synthetic facility, valid coordinate pair and claim-specific operating-coordinate evidence."
    }
  ],
  "companies": [],
  "compatibility": {
    "companyWeather": {"status": "unavailable", "reason": "Requires claim-specific sourced operating coordinates. Provider connectivity is not checked."},
    "futureProjections": {"status": "unavailable", "reason": "Requires evidenced operating geography mapping. Compatible product installation and provider connectivity are not checked."}
  },
  "limitations": []
}
```

The illustrative response abbreviates metrics/companies/limitations; actual responses contain all 16 metrics, one summary per company and four limitations. Per-company fields: id, name, supplierCount, customerCount, facilityCount, routeUsageCount, sourcedCoordinateCount, syntheticOnlySites, syntheticRouteGeometry, sourcedRouteGeometry, projectionMapping, operatingEvidenceState and measuredDependenceState. An edge is counted once globally, even when both endpoints participate in multiple relationships. Supply items and repeated usage geometries do not add commercial relationships or distinct corridors.

`status=available` describes the completeness summary, not external analysis availability. Compatibility `eligible` means the dataset contains evidence meeting the stated criteria; it does not prove provider connectivity or product installation. With no qualifying evidence the compatibility status is unavailable.

## Evidence criteria and schema limits

Existing `sourceFields` is an optional dictionary. To count a sourced fact conservatively, this increment recognizes explicit `sourceFields.fieldEvidence` mappings from a field name to evidence IDs. It does not add these mappings to supplied records or modify the importer. Supported field names are `operatingCoordinates`, `operationalShare`, `dependencyWeight`, `routeGeometry`, `routeUsage` and `providerGeographyId`.

Each referenced ID must also be in the record's evidenceIds. The evidence must have an HTTP(S) URL, nonblank claim, sourced/verified status and the record ID in entityIds. The record must be sourced and carry no explicit synthetic flag/status. Coordinates must be paired and bounded; geometry must be a valid bounded LineString. Observed route coverage requires both geometry evidence and company-route-usage evidence. Company projection eligibility additionally needs a sourced operating site associated with that mapped, non-synthetic region. Registration country is not operating geography.

This is evidence linkage, not external independent verification or semantic verification of source documents. Generic attribution, unsupported sourced labels and absent field links remain Unknown. A field-specific sourced schema migration/research import is future work.

For measured operational share, an explicit raw `sourceFields.operational_share=null` takes precedence over any assumed engine value. Evidenced numerical zero is retained as a real measured value. Measured edge weight requires weightBasis=measured plus its field evidence; dataset_reported topology never upgrades an assumed weight. Synthetic record status retained in sourceFields survives an assumption overlay; when original entity provenance cannot be recovered, the summary remains conservative.

The content hash observes the original dataset without mutation/default filling. It hashes typed canonical JSON: object keys in UTF-16 order, preserved array order and IEEE-754 big-endian hexadecimal numbers (zero normalized). This new coverage-specific SHA-256 convention produces identical Python/browser results despite native JSON float formatting differences. Existing engine input hashes and mathematics were not changed. Response timestamps do not affect the result; changes within the source snapshot do.

## Private runs

When activeCloudRun exists, Evidence exclusively uses that run's immutable sourceSnapshot. The pure browser adapter validates it and computes the summary in memory. It does not request the public coverage endpoint, upload the snapshot, write localStorage/demo history, or use a shared cache. Session/source identity gates the rendered result; effect cleanup cancels public requests and rejects late completions. Logout/account changes use the existing authentication state and clear/unmount private coverage.

A missing/incompatible source snapshot yields Coverage unavailable with an explicit explanation. There is no fallback to the selected installed dataset. A complete snapshot with missing evidence can still produce a useful summary with Unknown counts; absence of evidence is not the same as insufficient structural data. Existing private-report validation may reject malformed saved reports before activation, which also prevents their use.

Browser tests use a private six-company fictional snapshot while the selector remains on the 215-company imported dataset. The table shows six companies and its own content hash, makes zero public coverage calls while the private report is active and writes no private marker/run to localStorage. Earlier installed-dataset requests are checked separately for GET-only installed identifiers and empty bodies. After logout and a fresh login, it shows the ordinary installed dataset again. The test helper intentionally reloads on login, so the existing reference selection behavior is preserved. See `TASK03_INCREMENT1_REMEDIATION.md` for the later full regression verification.

## Verification

Final verification on 2026-10-10:

- `npm run test --workspace frontend`: **41 passed**.
- From backend, `.venv/Scripts/python.exe -m pytest tests/test_coverage.py tests/test_climateweb.py tests/test_climate_workflow.py tests/test_private_api.py -q`: **18 passed**. Includes complete Python/browser response and hash parity on mixed, empty, imported and reference datasets. Existing Starlette test-client deprecation warning only.
- `npm run test:e2e --workspace frontend -- e2e/coverage.spec.js`: **8 passed**, desktop/mobile, after correcting test-only assumptions about schema defaults and reload dataset selection.
- The preceding combined browser run exercised coverage, auth, climate and private analysis specs: **40 passed, 4 failed**. All **36 existing auth/climate/private-analysis regression checks passed**. The four failures were in the new private coverage tests' post-login dataset expectation, not privacy behavior: the helper intentionally reloads and returns to the reference dataset. The final focused eight-check rerun passed without retries. The earlier coverage run also caught the mock snapshot's omitted dataState default; that fixture was corrected.
- `npm run build`: **passed**, with existing dependency-annotation and large-bundle warnings.
- `git diff --check`: **passed**. Raw-source SHA-256 checks match the preserved manifest.

The API was also checked on the running backend and the Evidence table was inspected in the existing signed-in browser. The installed dataset response contains 215 companies, 350 commercial edges, 327 facilities, 4 corridors, 215 usages and 4 regions; imported content hash `f6fd6cf978ceaa31a82d627f94645e242a55c0745874ace71545cf82db52c660`.

Local services were restarted with `npm run dev:full` and remain available at http://127.0.0.1:5173/evidence and http://127.0.0.1:8000/docs. Raw-source hashes still match the preserved manifest.

## Remaining work (outside Increment 1)

No real operating evidence or World Bank product was added. Measured real dependence, coordinates, routes, replacement capacity and mapped climate geography remain unknown/unavailable as identified by the audit. Later increments may add field-level evidence import contracts, per-holding/graph/map summaries and sourcing workflows. Live email recovery and two-account RLS acceptance remain separate; mocked tests do not establish them. Stop here before those increments or Task 04.
