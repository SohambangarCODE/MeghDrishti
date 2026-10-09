# Data notes

Two independent datasets are available. `frontend/src/fixtures/reference.json` is the original fictional reference. `data/raw/climateweb/` preserves all three user-supplied corrected files byte-for-byte with SHA-256 manifest. Active representation: enriched JSON. The two CSVs represent the same source and are used only for importer parity tests or as an alternative import.

`backend/app/climateweb_importer.py` preserves company IDs exactly, maps JSON supplier/customer and CSV supplier_id/customer_id, parses JSON cells, scans all company rows for global configuration, and resolves only the simulation asset/route arrays. It does not add original arrays as duplicate nodes. Effective dependency weights already include replacement. Shared routes remain single entities; company-scoped route vulnerability is retained in route usage. Commodity links are visual context only.

Imported counts: 215 companies, 350 reported commercial edges, 327 synthetic facilities, four routes, 215 usages. Real company identity and dataset-reported topology do not verify operational locations, measured shares or weather. Original measured fields remain null in source metadata. Demo modeling explicitly uses assumed operational shares, vulnerabilities and effective commercial weights. No sourced operational dataset is installed.

Hash-addressed normalized artifacts live under `data/normalized/climateweb/`; `active.json` is atomically replaced only after validation. Invalid input cannot replace the active pointer. Backend snapshots retain their original source data, model and scenario. The supplied three reference calculations and allocation comparison are independently exercised through actual API calls. The original fictional reference suite is retained.

The generic company-only Sectivia staging importer remains separate legacy support; its namespacing policy is not applied to this corrected source adapter. No identity renaming or CSV+JSON concatenation is used here.

Official documentation consulted during implementation:

- [Open-Meteo forecast API](https://open-meteo.com/en/docs): daily temperature_2m_max, precipitation_sum, wind_gusts_10m_max; seven days, UTC, explicit units. Review [usage/pricing](https://open-meteo.com/en/pricing) before commercial use. Models/grids are not on-site instruments.
- [Supabase JWTs](https://supabase.com/docs/guides/auth/jwts) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): signing-key validation and database ownership enforcement.
- [World Bank CCKP CMIP6](https://worldbank.github.io/climateknowledgeportal/docs/collections/cmip6-x0.25.html): collection and indicator semantics. Downloaded files, geographic IDs and units need inspection before native-file parsing. The current normalized projection validator does not pretend to have imported a provider download.

Expected CCKP context: hd35 (days/year), optional tasmax (°C), annual climatology, historical 1995–2014, future 2040–2059, SSP2-4.5/SSP5-8.5, multi-model median. Optional p10/p90 describe model spread, not financial confidence.

Attribution: fictional fixtures cite the supplied PRD. Future Sectivia imports must carry CC BY 4.0 attribution and source date/license notes. Leaflet tiles display OpenStreetMap attribution and are only loaded when requested. Local list mode requires no map connectivity.
