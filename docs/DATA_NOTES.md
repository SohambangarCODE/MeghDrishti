# Data notes

All usable demo data is fictional, created from PRD section 9 in `frontend/src/fixtures/reference.json`. `scripts/create-fixture.mjs` reproduces it. The illustrative facility coordinate (20,78) is not a verified real operating site. No actual weather or projection values are bundled.

The initial workspace listing briefly contained `sectivia-companies.csv`, but the file was absent when read and on subsequent inspection. No bytes were imported and no source schema was claimed. The user subsequently confirmed that real datasets will be supplied later. `data/raw/sectivia/` is an empty destination.

The staging importer accepts an explicit ID/name column mapping and preserves source bytes under a SHA-256 filename, validates unique IDs, retains leading zeros, namespaces IDs as `sectivia:`, and reports unmapped fields. It imports one base source rather than combining CSV and JSON. Relationships and operational enrichment are deliberately not inferred. A source-specific relationship importer remains pending actual files/schema.

Official documentation consulted during implementation:

- [Open-Meteo forecast API](https://open-meteo.com/en/docs): daily temperature_2m_max, precipitation_sum, wind_gusts_10m_max; seven days, UTC, explicit units. Review [usage/pricing](https://open-meteo.com/en/pricing) before commercial use. Models/grids are not on-site instruments.
- [Supabase JWTs](https://supabase.com/docs/guides/auth/jwts) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): signing-key validation and database ownership enforcement.
- [World Bank CCKP CMIP6](https://worldbank.github.io/climateknowledgeportal/docs/collections/cmip6-x0.25.html): collection and indicator semantics. Downloaded files, geographic IDs and units need inspection before native-file parsing. The current normalized projection validator does not pretend to have imported a provider download.

Expected CCKP context: hd35 (days/year), optional tasmax (°C), annual climatology, historical 1995–2014, future 2040–2059, SSP2-4.5/SSP5-8.5, multi-model median. Optional p10/p90 describe model spread, not financial confidence.

Attribution: fictional fixtures cite the supplied PRD. Future Sectivia imports must carry CC BY 4.0 attribution and source date/license notes. Leaflet tiles display OpenStreetMap attribution and are only loaded when requested. Local list mode requires no map connectivity.
