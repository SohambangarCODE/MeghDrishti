# Sectivia sample investment portfolio

The existing generic sample loader and installed dataset fixture were reused. The Portfolio page now exposes **Load Sample Investment Portfolio** above My Portfolios. It selects the installed Sectivia dataset (`climateweb`), validates its company matches and recorded commercial chain, and loads a new unsaved private draft. It does not save or analyze automatically. Replacing an unsaved draft requires confirmation; cancel leaves the draft intact.

| Installed company ID | Company | Simulated allocation (INR) |
| --- | --- | ---: |
| `a` | Agilent Technologies | 10,00,000 |
| `abbv` | AbbVie | 40,00,000 |
| `cah` | Cardinal Health | 30,00,000 |
| `cvs` | CVS Health | 20,00,000 |
| Total | | 1,00,00,000 |

All four companies match installed records. The dataset records Agilent Technologies → AbbVie → Cardinal Health → CVS Health; the strongest path to CVS can also pass through McKesson. Relationships are dataset-reported, not independently verified; dependency weights, operational sites, events and allocations are synthetic assumptions. Missing measured inputs remain unknown.

## Demonstration procedure

1. Keep the configured frontend and backend running at `http://127.0.0.1:5173` and `http://127.0.0.1:8000`.
2. Sign in and open Portfolio.
3. Click **Load Sample Investment Portfolio**. Confirm replacement only if you want to discard an existing unsaved draft.
4. Review the four matched holdings and ₹1 crore total. Click **Save Portfolio** and wait for the Supabase success notice.
5. Click **Analyze saved portfolio**. Results should use the Sectivia snapshot, not the fictional reference dataset.
6. Use **Generate AI Assessment**, **Inspect graph**, Locations, **Compare this snapshot**, and Reports. Reopening the private report restores its immutable snapshot in memory.

## Actual verification on 2026-10-10

Real browser verification used the existing signed-in account and live authenticated backend, without reading credentials. Supabase save succeeded, analysis produced Results, and Reports listed and reopened the persisted report. Dataset version remained `climateweb:demo-operational-v1-commercial-v1-resolved-v2`.

The backend calculated total capital INR 10,000,000 and assumed stress-weighted exposure INR 473,532.89. Gemini `gemini-2.5-flash` returned all six assessment sections for this run. Graph displayed five relevant company nodes and propagation paths. Locations used the immutable private source snapshot, with 327 recorded synthetic sites, four corridors, and the offline location list. Online map tile availability was not separately verified.

The live comparison transferred INR 1,000,000 from AbbVie to CVS Health: total capital stayed INR 10,000,000 and proposed modeled exposure was INR 431,738.69. The original report reopened with exposure INR 473,532.89. Comparison and report requests intermittently displayed `Failed to fetch`; explicit retries succeeded. This remains an environment/network reliability limitation, not a claim of uninterrupted connectivity.

Frontend unit verification: **66 tests passed**. Focused browser suite: **16 tests passed** across desktop and mobile (sample workflow plus existing private portfolio/session regressions). Browser tests mock authentication and private persistence; the live browser checks above independently exercised actual Supabase save, analysis, comparison and reopening. Production build passed with existing chunk-size and dependency annotation warnings. No backend, datasets, mathematical formulas, migrations, or authentication contracts were changed.

Changed implementation files: `frontend/src/pages/Portfolio.jsx`, `frontend/src/state/AppState.jsx`, `frontend/src/state/usePortfolioWorkspace.js`. Added regression coverage in `frontend/e2e/investment-sample.spec.js` and this report.
