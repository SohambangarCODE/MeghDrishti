# Judges demo walkthrough

Start from the project root: `npm run dev:full`. Keep the terminal running. Open http://127.0.0.1:5173. Authentication is optional for this demonstration.

1. Select **Sectivia + synthetic operations**. Explain that company identities and reported commercial links are supplied data, while operating enrichment and model assumptions are synthetic.
2. Open Portfolio and load the supplied demo holdings, or upload/review a CSV.
3. Open Locations and load online map tiles. Click an empty map point; a blue marker identifies the independent weather selection. Alternatively type latitude 20 and longitude 78 and click Set weather point. These are demonstration coordinates, not a verified company facility.
4. Click Fetch live point forecast. Show the seven-day table, Open-Meteo attribution, fetched timestamp, heat screening index and cache status. Internet is required. Unavailable/stale responses remain visibly labeled. The forecast does not alter company exposure calculations.
5. Open Scenarios and use the supplied facility heat scenario with default holdings/parameters. Run synthetic analysis. Expected weighted exposure: INR 473532.89032269525.
6. Inspect results and affected graph paths. Explain strongest simple paths, at most three commercial hops and unique capital. Unknown inputs remain unknown.
7. Compare an INR 1000000 transfer from AbbVie to CVS. Expected proposed weighted exposure: INR 431738.6903227998 with the supplied baseline. This is hypothetical exposure, not financial loss.
8. Save/reopen the local report and export JSON/CSV. No sign-in is needed.

Live point forecasts are independent context. Verified company operating inputs and sourced-event snapshots are still required before live weather can drive company risk results. Future climate files and deployment remain deferred.

Graph presentation: start with Portfolio dependencies, then select one path under Strongest and alternative paths to isolate it. Green cards identify holdings; solid arrows are supplier-to-customer links. Use Clear path focus to return, or Explore all entities for operational/context records. Search/type filters recenter the visible layout. Display limits never alter calculations.
# Transport corridors

On Locations, select the Sectivia dataset and choose Demo Freight Corridor 01 in
Transport corridor. Load online map tiles to see the selected orange line and its
start/end markers. Expand Companies using this corridor to inspect assumed usage.
Use Weather at route start/end, then Fetch live point forecast, for independent
weather context. Inspect selected route in graph opens its evidence. Configure
route disruption opens the supplied synthetic scenario; run the analysis to see
portfolio impact (849,000 INR weighted exposure with the default imported holdings).
These supplied geometries are synthetic corridors, not verified road routes or
observed shipment paths. Weather does not change the synthetic scenario result.

