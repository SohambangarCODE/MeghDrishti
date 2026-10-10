# Task 05 Phase 2 — CCKP XLSX ingestion

## Outcome and milestones

The genuine files parse successfully and satisfy the existing projection **schema** as
candidate records. Annual time-column interpretation remains unresolved. They have
been quarantined, not installed as approved projection records. Temperature comparison
returns `unavailable` with `difference: null`. There is no silent dataset substitution.

| Milestone | Actual result |
| --- | --- |
| Source parsing | Passed for both supplied workbooks |
| Schema/numeric/geography checks | Passed; exact values preserved |
| Semantic verification | Awaiting verification of date-style time-column labels |
| Active projection installation | Blocked intentionally; explicit installation fails |
| Quarantine storage | Written successfully, with unchanged raw copies |
| Repository/API availability of genuine values | Unavailable; quarantine is excluded |
| Display of genuine values in UI | Not implemented or claimed |

No frontend, simulation, company dataset, authentication, private report, migration,
Graph or Locations changes were made. No Git operations or CCKP data API requests
were performed. Only official documentation was consulted online.

## A. Files changed

- `backend/app/cckp_xlsx.py`: read-only XLSX adapter, candidate provenance, semantic
  gate, deterministic content hashes, guarded comparison, install and quarantine.
- `backend/scripts/import_cckp_xlsx.py`: executable CLI, default validation without writes,
  mutually exclusive explicit install/quarantine actions, clear failure messages.
- `backend/app/projections.py`: extracted the existing validated storage into
  `store_projection_records`, reused by the CSV/JSON importer and XLSX adapter;
  preflight, unverified-record rejection, raw source integrity, immutable repeat installs.
- `backend/requirements.in`, `backend/requirements.lock.txt`: pinned read dependency
  `openpyxl==3.1.5`, with `et_xmlfile==2.0.0` in the lock.
- `backend/tests/test_cckp_xlsx.py`: genuine workbook and rejection/contract tests.
- This report.
- Both originals were found in Downloads, not in the specified incoming directory.
  Byte-identical copies were placed under `backend/data/incoming/cckp/`.
- Audit: `backend/data/projections/quarantine/afc8a10903aff9cc136687c2af1bb8a8e29cd3acfc64dae5672f4bf149033c71.json`.
  Its `raw/` sibling contains the two SHA-256 named, unchanged XLSX copies.

## B. Observed schemas and D. Exact values

| Source | Only worksheet | Dimensions | Header A1:C1 | Row A2:C2 |
| --- | --- | --- | --- | --- |
| Historical | `all` | 2 rows × 3 columns | `code`, `name`, `1995-07` | `IND`, `India`, **29.68** |
| Future | `2040-2059` | 2 rows × 3 columns | `code`, `name`, `2040-07` | `IND`, `India`, **30.77** |

Values are numeric cells, not formulas. Time headings are literal strings, not Excel
date cells. There are no additional metadata sheets or unit cells. Both workbook
properties say `Unknown Creator` and `Untitled Spreadsheet`, with no description.
Creation/modification metadata is 2026-10-10 03:24:22 for historical and 03:20:44 for
future. These properties are retained as source metadata, **not download timestamps**.

## C. Time headings and E. Compatibility

The filename specifies the requested CMIP6 annual climatology product. The future
worksheet also identifies 2040–2059. Official documentation defines annual climatology
as a single period-average layer, and the provider product schema identifies annual
aggregation and the two supported periods. However, none of the consulted documentation
explains how `1995-07` or `2040-07` maps to the entire annual climatology window. The
workbooks themselves supply no such explanation.

The adapter therefore preserves these headings verbatim and assigns
`awaiting_time_label_verification`. It does not reinterpret `07` as July observations,
claim a documented midpoint convention, or compute an approved historical/future delta.
The filename alone is not used to erase conflicting/ambiguous source time labels.

Units, variable, ensemble and median mapping are supported by these primary sources:

- [World Bank CCKP metadata](https://climateknowledgeportal.worldbank.org/index.php/metadata):
  `tasmax` is average daily maximum surface air temperature over the aggregation
  period, measured in °C; climatology summarizes a period, with one annual layer.
- [World Bank CMIP6 collection documentation](https://worldbank.github.io/climateknowledgeportal/docs/collections/cmip6-x0.25.html):
  supports the stated collection, periods, annual aggregation, SSP2-4.5, multi-model
  ensemble and median/50th percentile mapping.
- [CCKP download documentation](https://climateknowledgeportal.worldbank.org/download-data):
  defines filename/API product fields and explicitly uses `IND` for a country request.

If source time interpretation is subsequently established, comparison additionally
requires equal geography, geography level, collection, variable, units, product,
ensemble, percentile, baseline/reference period, statistic and model calculation.
Historical must be 1995–2014/historical and future 2040–2059/ssp245. No extrapolation,
p10/p90 inference, loss calculation or financial confidence interval is added.

Tests of the accepted full-period-header branch use disposable copies of the genuine
values with explicit period headers. Their subtraction is **1.09°C**. Those copies are
test inputs, not provider evidence, and are never installed in the application. This
does not validate the ambiguous headers in the supplied production sources.

## F. Normalized candidate contract

Existing `validate_projection` is unchanged. Each candidate preserves:

```json
{
  "regionId": "IND",
  "geographyName": "India",
  "geoLevel": "national",
  "collection": "cmip6-x0.25",
  "variable": "tasmax",
  "unit": "°C",
  "scenario": "historical or ssp245",
  "period": "1995-2014 or 2040-2059",
  "product": "annual climatology",
  "ensemble": "multi-model",
  "percentile": "p50",
  "value": "unchanged numeric source cell",
  "baseline": "1995-2014",
  "sourceURL": "https://climateknowledgeportal.worldbank.org/download-data",
  "downloadedAt": null,
  "verificationStatus": "awaiting_time_label_verification",
  "companyLocationVerified": false,
  "usedInSimulation": false
}
```

This is an illustrative contract, not executable JSON projection data. Baseline denotes
the requested reference period from product metadata; it is not an invented baseline
value or evidence that future values are anomalies. Additional fields retain source
filename, raw hash, sheet/cell, raw labels, model/calculation/statistic/percentile codes,
documentation URLs, verification reason, adapter version and normalized content hash.
Each source report stores its UTC inspection/import timestamp separately. Actual download
time remains unknown. The normalized hash excludes that runtime timestamp.

## G. Commands

From the project root in PowerShell:

```powershell
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.lock.txt

$historical = 'backend/data/incoming/cckp/cmip6-x0.25_climatology_tasmax_climatology_annual_1995-2014_median_historical_ensemble_all_mean.xlsx'
$future = 'backend/data/incoming/cckp/cmip6-x0.25_climatology_tasmax_climatology_annual_1995-2014,2040-2059_median_ssp245_ensemble_all_mean.xlsx'

# Default: validate and report status without writing anything.
backend/.venv/Scripts/python.exe -m scripts.import_cckp_xlsx --historical $historical --future $future --output data/projections

# Explicit quarantine: write audit and raw copies under a nested quarantine folder.
backend/.venv/Scripts/python.exe -m scripts.import_cckp_xlsx --historical $historical --future $future --output data/projections --quarantine

# Explicit installation. Currently exits 2 because the supplied labels are unresolved.
backend/.venv/Scripts/python.exe -m scripts.import_cckp_xlsx --historical $historical --future $future --output data/projections --install
```

There is no force/skip-verification flag. Do not edit original workbooks to make them
pass. A date-label mapping needs authoritative export evidence and a reviewed adapter
update with source-specific tests. The current verified installation branch accepts only
an explicit, matching full-period column label. Both sources are validated and preflighted
against installed products before either write. Individual manifests use the existing
atomic replacement mechanism; two-file installation is not a database transaction across
process interruption. Repeat installs preserve immutable existing manifests, and conflicting
products require an explicit version migration. Repeat quarantine keeps the first audit
timestamp and rejects damaged/missing raw copies.

## H. Hashes and provenance

| Source | Original SHA-256 | Normalized candidate-list SHA-256 |
| --- | --- | --- |
| Historical | `df46b53cdc00dedfd080f216c07d27f028f83b75638231ba767b4ed9cadb4999` | `fafac9b63b2703cee9660d4bd387d953910d90de009b4e75eab6b3f52cc3591a` |
| Future | `0bb10cdca67f933c022a76af48f03e07e1f845112ff9535c650f9053c154c5ac` | `45cfab7aba963f3eb2c8660387a747c963255ccc903323e13b2d64beef3a2522` |

The source URL is the documented CCKP download page, not an invented download request
URL. Files are user-supplied downloads; workbook properties do not establish external
authenticity or download time. Downloads, incoming copies and quarantine raw copies
have the same respective byte hashes.

## I. API/UI integration and K. Limitations

`ProjectionRepository` reads only top-level installed manifests. Nested quarantine
audit/candidate records are never returned. Both existing company datasets still have
synthetic regions without verified World Bank geography mappings. Their projection API
responses remain HTTP 200 `unavailable`, with empty records and the existing guard reason.
An unrecognized `IND` region in either dataset remains HTTP 422.

The current `/api/v1/projections` contract requires a region belonging to an installed
company dataset; FutureContext obtains its choices from those dataset regions. There
is no standalone national-reference selector/contract. The permitted validated-import-only
scope was used, rather than adding India to company datasets or weakening the guard.
Even after time labels are verified, exposing national context needs a separate approved
reference request independent of company operating locations. Historical private source
snapshots remain untouched.

Genuine climate values are therefore **not currently available in the frontend**.
The missing evidence is an authoritative explanation tying each raw date-style column
to the annual period. This is the current installation blocker, not a parsing failure.

## J. Verification

Focused command (run inside `backend/`):

```powershell
.venv/Scripts/python.exe -m pytest tests/test_cckp_xlsx.py tests/test_climate_workflow.py tests/test_providers.py -q
```

**37 passed**. Includes 30 new XLSX cases, genuine schemas/values/geography/provenance,
unresolved label handling, hashes/determinism, unchanged originals, duplicate quarantine,
raw corruption, malformed/missing/extra worksheets, missing/formula/boolean values,
unsupported variables/geographies, comparison compatibility, guarded installation,
accepted-schema repository round-trip, no synthetic promotion and API/CLI contracts.

Full backend regression, run inside `backend/`:

```powershell
.venv/Scripts/python.exe -m pytest tests -q
```

**85 passed, 1 warning in 20.20 seconds.** Existing engine, importer, coverage,
authentication, private API, provider and parity tests passed along with the new tests.

The running localhost backend was also checked directly at
`http://127.0.0.1:8000/api/v1/projections` using the reference dataset's first region,
`tasmax`, `2040-2059`, `ssp245`: HTTP 200 `unavailable`, empty `records`, with the
unchanged synthetic-geography guard reason. Original Downloads hashes were checked
again after processing and matched the hashes above.

Frontend code is unchanged; frontend unit/browser/build checks are not required by
this phase's conditional verification scope and were not rerun. No UI success is claimed.
One existing Starlette `httpx` deprecation warning occurs during backend tests.

Stopped at Task 05 Phase 2. Task 06 was not started.
