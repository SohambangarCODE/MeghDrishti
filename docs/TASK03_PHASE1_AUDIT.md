# Task 03, Phase 1: dataset completeness and missing evidence

Audit date: 2026-10-10. **The corrected dataset is installed and served by the running backend. It supports a synthetic demonstration, not verified company climate exposure.** There are 215 dataset-reported company identities and 350 dataset-reported commercial relationships. Every supplied operating footprint is synthetic, every numeric propagation weight is assumed, and no compatible projection product is installed.

Only audit/report files were added. Application code, raw/normalized datasets, simulation parameters, Supabase, authentication, private portfolios and saved reports were not changed. Existing uncommitted Task 02 changes were retained. No Git commit/checkpoint or deployment was performed.

## A. Installed inventory and runtime selection

The preserved sources are in `data/raw/climateweb/`:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| climateweb-companies-enriched.csv | 1,751,460 | 71e3aa99a785d0ce4acb45e709d9e94d93b8fd00042cf2b434a513b9e34448d1 |
| climateweb-relations-enriched.csv | 410,503 | b47c236cc6383648babfd3b041cd76016897f5ed045f3ba33aeaa3723e3ce16a |
| climateweb-supply-chain-enriched.json | 3,218,100 | 64ea410b979aef78931111c3695c53de5becc62eafe1f334e4cb584fc293586d |

All three hashes match `manifest.json` and the copies in the user's Downloads directory. JSON is the active source representation; the CSV pair is an equivalent alternative, never an additional graph to concatenate.

`data/normalized/climateweb/active.json` points to `b606b2eb66c080275eec82d5b7f4e32c457816ee2fb5d69b331af7f2c17970e5.json`. Its digest matches the pointer. Dataset version: `climateweb:demo-operational-v1-commercial-v1-resolved-v2`. Source enrichment schema: `meghdrishti.synthetic-operational/1.1`; generation time: `2026-10-09T13:38:19Z`; wire schema: `1.0.0`; engine model: `demo-1.0.0`. The supplied model label is `strongest-simple-path-commercial-v1` and is retained in source metadata.

The other normalized file, `765efff7ac6d8b45ddb599fb241d40d2b571c3fca4b4e08c306c2196a2bbb4bf.json`, is inactive. It has the same dataset-version label/counts but different company source metadata: 215 `segment` keys versus the active `segmentId` keys (430 add/remove differences). This is a version-label ambiguity, not evidence that the running app uses the old file. Hashes distinguish the artifacts; the audit confirmed the active artifact exactly matches today's adapter output.

`backend/app/climateweb_importer.py` reads JSON endpoints from supplier/customer or CSV endpoints from supplier_id/customer_id, parses JSON cells and scans all CSV rows for the single nonblank global configuration. It imports `simulation_assets` and `simulation_routes` once, not both operational representations. It validates fractions, coordinates, route geometry and effective replacement semantics before immutable promotion. Actual JSON and CSV adapter outputs produce identical normalized datasets.

`backend/app/repositories.py` loads the pointer once at process initialization and checks its hash. `GET /api/v1/datasets` exposes the catalog; `GET /api/v1/demo?datasetId=climateweb` supplies the fixture. Explicit dataset versions are also accepted. Changes to the active pointer require a backend restart to affect this repository instance. Omitted dataset IDs default to the fictional reference fixture.

`frontend/src/state/AppState.jsx` uses FastApiRepository when `VITE_API_BASE_URL` exists, otherwise MockRepository (fictional fixture only). Dataset selection is catalog-driven; saved portfolios select their saved dataset, and immutable private runs carry their own source snapshot. A saved report can legitimately contain a different snapshot than today's active dataset. Coverage of that report must describe its snapshot, not silently substitute the active catalog.

Read-only runtime verification: the backend on port 8000 returned a dataset structurally equal to the active artifact. The existing browser selected **Sectivia + synthetic operations**, displayed **FastAPI / NetworkX**, and displayed the real-identities/synthetic-operations disclosure. No workspace selections or private records were changed for this audit.

## B–D. Company detail, quantified summary and missing fields

See [all 215 company rows](task03-audit/COMPANIES.md), [coverage and missing-field tables](task03-audit/COUNTS.md), and [machine-readable field states, schemas, inventory and checks](task03-audit/audit.json). The JSON includes every audited field for every company, counts, explanatory notes and declared missing fields.

| Finding | Numerator / denominator | Percentage |
| --- | ---: | ---: |
| Reported IDs, names and sectors populated | 215 / 215 companies | 100% |
| At least one recorded supplier/customer edge | 192 / 215 companies | 89.30% |
| No recorded commercial edges | 23 / 215 companies | 10.70% |
| Verified operating coordinates | 0 / 215 companies | 0% |
| Synthetic-only facilities | 215 / 215 companies | 100% |
| Lacking operating-location evidence | 215 / 215 companies | 100% |
| Illustrative facility coordinate pairs | 327 / 327 facilities | 100% synthetic |
| Measured operational shares | 0 / 327 facilities | 0% |
| Assumed operational shares | 327 / 327 facilities | 100% assumed |
| Measured commercial weights | 0 / 350 edges | 0% |
| Assumed effective commercial weights | 350 / 350 edges | 100% assumed |
| Missing effective demo weights | 0 / 350 edges | 0% |
| Unknown real measured dependence | 350 / 350 edges | 100% |
| Usable synthetic route geometry | 215 / 215 companies | 100% synthetic |
| Evidence-supported observed route geometry | 0 / 215 companies | 0% |
| Measured logistics dependence | 0 / 215 route usages | 0% |
| Edge-specific evidence URLs | 0 / 350 edges | 0% |
| Verified projection geography mappings | 0 / 215 companies | 0% |
| Sourced provider-geography mappings | 0 / 4 regions | 0% |

There are 4 distinct synthetic corridors, 215 company-route usages, 4 synthetic regions, 1 synthetic commodity, 350 synthetic supply-item context records, 2 dataset-level evidence entries and 3 synthetic scenarios. Supply items are not another 350 commercial relationships. Each company has a synthetic footprint and route association; that does not establish a real footprint or dependency.

Missing evidence includes: observed coordinates, ownership and measured operational shares on all 327 facilities; product/service, source and URL on all 350 commercial rows; observed geometry and verified transport mode on all 4 routes; measured dependence, vulnerability and observed replacement capacity on all 215 route usages; and provider mapping on all 4 regions. All 215 company enrichment-check dates are blank. SpaceX (`spacex`) has no ticker/exchange; its stable ID/name are present, so this is not a missing identity or necessarily an error for an unlisted company.

Commercial measured dependence is absent from the inspected commercial source schema, rather than 350 explicit null cells. Its absence establishes **Unknown**, not a numerical zero. Estimated completeness of the universe of actual suppliers, sites or shipments cannot be computed: the source has no authoritative real-world total. Financial accuracy, confidence, calibrated damage coverage and observed replacement capacity likewise cannot be quantified. Percentages here describe the installed records only.

## E. Provenance rules and analytical consequences

| State | Audit meaning | Present example |
| --- | --- | --- |
| Sourced | Identifiable evidence supports the specific claim; independent verification must be stated separately | No supplied operational records meet this criterion |
| Dataset-reported | In the supplied dataset, not independently verified in this audit | Company identities, sectors, supplier/customer endpoints |
| Synthetic | Generated illustration/testing entity or association | Sites, coordinates, regions, corridors, company-route associations, commodity roles |
| Assumed | Chosen simulation parameter, not measured | Operational share, heat/route vulnerability, dependence weights, replacement, scenario severity |
| Unknown | Required fact/value/evidence not established | Actual site ownership, real dependence, measured vulnerability |
| Unavailable | Compatible data/service cannot perform the requested analysis now | Company-site weather exposure and future projection context |

The dataset attribution/CC BY 4.0 URL is an identifiable package reference, not evidence for each operating facility, commercial contract or company identity. No independent external verification was attempted; these findings describe supplied evidence, not claims that evidence does not exist elsewhere. Source country is country of registration, never operating coordinates. Sector labels such as `medicin` are supplied taxonomy identifiers, not audited industry classifications.

Normalized facilities store the assumed share in engine field `operationalShare`, while measured raw `operational_share` stays null in `sourceFields`; routes do the same for shipment share/dependence. Hazard fractions are assumed. Commercial record provenance is dataset_reported for topology, but `weightBasis=assumed` and sourceFields hold assumed effective weight and replacement. Record-level provenance alone therefore cannot describe all fields faithfully. The importer does not retain every raw evidence timestamp, URL or assumption definition at field level; generic evidence entries and raw files are needed to understand those gaps.

Replacement is already included in `effective_dependency_weight_assumed`; the importer validates base × (1−replacement), and the commercial engine uses the effective weight directly. No replacement factor may be added again. Strongest simple paths, a three-hop maximum, cycle prevention and unique capital remain intact. Commodity context must never carry stress.

The engine retains null stress for missing seed/path inputs and warns about absent direct coverage. Its `coverage.directKnownHoldingCount` counts computable **scenario-specific** direct seeds, including assumptions. It is not verified facility coverage: an untargeted company can have synthetic facilities yet null direct stress. An indirect path can yield a modeled result without known direct operations. No affected path is not evidence of safety. Demo-computable parameter coverage and sourced-evidence coverage must be displayed separately.

The weather company-screening endpoint excludes synthetic facilities and needs sourced coordinates. Independent selected-point forecasts exist and set `companyLocationVerified=false`, `usedInSimulation=false`; they cannot upgrade company evidence. Runtime company weather is marked not configured. The projection endpoint rejects synthetic/unmapped geography; its read-only example returned unavailable. There are **0 installed projection products** under `data/projections`, so the World Bank mapping/query infrastructure does not provide actual projection coverage here.

## F–G. Existing presentation and priority defects

| Area | Existing functionality | Gap or misleading behavior | Priority |
| --- | --- | --- | --- |
| Evidence (`WorkspacePages.jsx`) | Dataset ID, matching-versus-operating warning, global known gaps, two evidence claims, integration status | No numerators/denominators, company drilldown or field-state summaries. Uses current app dataset while active private report may carry a different snapshot. Document date can render blank; retrieved time is hard-coded unavailable rather than record-driven. URLs not shown as evidence links | P1 aggregation/snapshot consistency; P2 labels |
| Portfolio | Match/review/exclude, stable IDs, totals and unsupported capital | No per-holding verified/synthetic/missing coverage. Matched status does not tell users why direct weather/projection analysis is unavailable | P1 |
| Graph | Node provenance, raw record JSON, readable entity/edge lists, supported paths, commodity non-propagation explanation | Edge payload lacks weightBasis/evidence/missing fields; no dedicated edge inspector. `operates` links name synthetic company-site associations as operations. Company dataset_reported badge can conceal assumed commercial weights | P1 field provenance; P2 wording |
| Locations | Coordinate precision, synthetic corridor warning, usage assumptions, company filtering, offline list, weather exclusion notices | Location source text hard-codes “synthetic reference fixture” for imported records. “Operator” association is assumed. Lists up to 50 sites without total evidence denominators. No per-company completeness summary | P1 coverage; P2 wording |
| Overview/Welcome | Global synthetic and loss disclaimers | Overview says own-operation coverage “remains unknown” regardless of scenario-computable direct counts, and says no weather/projection feed connected despite selected-point weather functionality. Empty private workspace says reference portfolio ready although no sample is preloaded. Welcome says fictional companies even with imported identities | P2 localized corrections |
| Service status | Explicit warning configuration is not connectivity proof | “Open-Meteo not configured” refers to company screening while point forecast is separately enabled. World Bank “file query available” does not explicitly show zero products. Supabase “configured, unverified” is not a per-workflow acceptance status | P2 clarify scope; preserve honest verification distinction |
| Dataset artifacts | Hash verification and immutable content | Two artifacts share a dataset-version label with different source metadata. DatasetVersion alone cannot guarantee identical snapshot content | P2 record hash/revision discipline |
| Documentation | Existing importer/setup explanations | `data/raw/sectivia/README.md` says no source supplied; clarify that destination is empty but ClimateWeb/Sectivia package exists separately | P2 documentation |

These are source-code inspection findings, not claims that every page was newly exercised interactively. The read-only browser check establishes current selector/engine/disclosure; focused existing tests establish import/reference/unknown-weather boundaries. Scope excludes redesign and real operational enrichment.

## H. Small Antigravity-safe fixes (future work only)

1. Replace imported location “synthetic reference fixture” with “supplied synthetic operational enrichment”; label the operator association as assumed.
2. Change blanket fictional-company copy to distinguish fictional reference from reported identities with synthetic operations using existing dataState.
3. Replace blank evidence dates with Unknown and label generic package attribution separately from entity evidence.
4. Explain selected-point weather is available independently; verified company exposure and projections remain unavailable. Do not turn service availability into evidence coverage.
5. Rename displayed synthetic “operates” associations to “assumed operating association” without changing graph edge kinds/calculations.

These are localized text/source-label fixes. Antigravity must not invent percentages, change normalized contracts/weights, infer coverage from non-null assumptions, or implement backend aggregation. Have Codex provide tested summary data first before any UI coverage badges.

## I. First focused implementation prompt

The copy-paste-ready prompt is [TASK03_INCREMENT1_PROMPT.md](TASK03_INCREMENT1_PROMPT.md). It requests a pure read-only normalized-dataset completeness aggregator, a versioned API response and a minimal Evidence summary. It deliberately postpones field-level importer redesign, portfolio/graph/map expansion and sourcing real operational data. No implementation from that prompt was started.

## J. Reproduction and acceptance

From repository root, with the existing backend development server running:

```powershell
backend/.venv/Scripts/python.exe docs/audit_task03.py
Push-Location backend
.venv/Scripts/python.exe -m pytest tests/test_climateweb.py tests/test_climate_workflow.py -q
Pop-Location
git diff --check
```

The script writes only `docs/task03-audit/`. It hashes originals, compares Downloads copies when present, checks installed/adapter JSON equality and CSV/JSON parity, verifies ID/endpoints and operational sums, and performs public read-only localhost queries. If localhost is unavailable, it records that limitation rather than claiming runtime success. It never calls import promotion or private APIs.

Executed results: all 11 integrity/parity assertions passed; runtime dataset matched; all Downloads copies matched; 9 focused importer/climate workflow tests passed (one existing Starlette deprecation warning). Existing tests compare three fixture reference calculations through the actual FastAPI handlers and verify unavailable weather/projections and scenario separation. Those tests are not live provider or private RLS acceptance. No application changes required a new production build or full browser rerun in this audit.

Audit acceptance: exactly 215 unique company rows, 350 relationship IDs/endpoints, 327 unique facilities, 4 corridors and 215 usages; measured-null fields retained; no double representation; explicit denominators; unknown versus unavailable distinguished; absent edges not safety; no secret data captured; no raw/app modifications. Regenerating the report changes audit timestamps/runtime service observations, while data-derived counts and hashes remain reproducible.
