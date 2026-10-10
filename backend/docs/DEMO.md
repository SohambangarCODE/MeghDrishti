# Demo walkthrough

1. Start `npm run dev`. Open `/welcome`, then **Open demo workspace**. All screens display Demo simulation.
2. Run the reference portfolio. Verify total INR 1,00,00,000, connected INR 90,00,000, assumed weighted exposure INR 13,34,340. Direct stress for the holdings is unknown.
3. Inspect Results paths. Delta → Aster → Beacon → Cedar reaches depths 1, 2 and 3. Evergreen reads No recorded affected path.
4. Open Graph. Select a node through either the graph or keyboard-accessible table. Select paths to highlight them. Filtering does not change analytical metrics.
5. Open Compare from the result. Transfer INR 10,00,000 from Aster to Evergreen. Verify total 1,00,00,000, connected 80,00,000 and weighted 10,82,340. The event and evidence remain fixed. Apply only to the draft if desired.
6. In Portfolio, load the reference demo. Download a CSV template. Upload a file containing an unsupported company; preview requires a reviewed match or explicit exclusion before commit. Invalid/negative values and mixed currencies cannot be imported.
7. In Scenarios choose route only and run. Delta's route seed is 0.192; Aster stress is 8.064/100. Change the hop limit to see the selected commercial reach. Zero intensity retains structural connection but produces zero assumed exposure on supported paths.
8. Locations defaults to an offline list. The optional map has illustrative coordinates, not a live operational feed. Evidence lists unavailable integrations and missing fields.
9. Export JSON and CSV from Results or Reports. JSON retains the full source/scenario snapshot. Print from Results for the readable report. Local history is bounded and falls back to memory if storage is denied.
10. Optionally start FastAPI and set `VITE_API_BASE_URL` as described in README. Restart the UI and repeat the reference analysis; Overview identifies the NetworkX engine. Stop the backend to verify an honest error instead of a synthetic/live relabel.

Do not present this as a validated investment-loss prediction, a recommendation to buy Evergreen, live weather monitoring, or an authenticated production dataset.
