# Stitch integration

Local export: `frontend/stitch-export/manifest.json`. Eleven HTML/PNG originals plus exported DESIGN.md preserved. No remote project/screen IDs are available through the installed skills-only plugin. No regenerated designs.

| Route | Data / operation | Status |
|---|---|---|
| /welcome | Shared fictional dependency preview, workspace links | Functional |
| /auth | Existing configured Supabase client | Configuration-dependent; demo access works |
| /overview | GET /api/v1/demo; latest local immutable run; POST /analysis | Functional |
| /portfolio | CSV parsing, explicit rupees/lakh units, matching, exclusions, duplicate merge; API validates again during analysis | Functional |
| /graph | Snapshot graph adapter, React Flow, selection/search/filters/paths | Functional |
| /locations | Fixture coordinates, Leaflet optional OSM tiles, shared entity IDs and offline list | Functional; route geometry unknown |
| /scenarios | Shared scenario contract; POST /api/v1/analysis | Functional synthetic automatic / single-target what-if; future data absent |
| /results/:runId | Immutable local snapshot returned by API; chart/table/paths/export | Functional |
| /compare | POST /analysis restores exact baseline; POST /compare | Functional fixed event/evidence/model |
| /evidence | Canonical fixture evidence and explicitly absent sources | Functional |
| /reports | Browser RunHistory save/open/delete; JSON/CSV/print | Functional |

Backend schemas and numerical engine remain unchanged. API mode loads its dataset through FastApiRepository; browser mode uses the existing explicit mock adapter when VITE_API_BASE_URL is absent. Network failure never silently changes engine mode. Graph and import review use normalized client adapters; they do not need duplicate API requests. Existing graph, matching, validation, run and explanation endpoints remain available.

## Persistence

Completed analyses automatically save up to 20 full snapshots to `meghdrishti:runs:v1` in localStorage. Save report updates that archive; open uses an immutable clone; deletion updates the archive. If storage is denied, changes apply only for the session with a visible warning. Server demo runs are separate bounded process memory and are not the reports persistence layer. Deleting a browser report does not claim to delete its server copy.

## Design corrections

Preserved shared shell, muted teal/lilac surfaces, compact tables, metric cards, analytical split panes and responsive navigation from Stitch. Removed unsupported compliance, forecast, confidence and facility-count claims. Company IDs and capital come from the canonical fixture. Default Delta seed is 0.6; all three dependency weights are shown. Unknown exposure is not shown as safe. Screens do not execute exported inline handlers, CDN scripts or dummy links. No new dependencies.

Live Supabase provisioning, sourced datasets, weather, CCKP, Gemini and deployment remain deferred by scope. Backend audit: 35 tests pass; migrations/JWT/repository scaffolding exist, but no live connection is claimed.

Start both services from repository root: `npm run dev:full`. UI: http://127.0.0.1:5173. API docs: http://127.0.0.1:8000/docs. See README for dependency installation and separate-terminal commands.

Export limitation: the Portfolio screen.png is a 28-byte original failed-fetch placeholder (`<FIFE Image failed to fetch>`). Its HTML is intact and used for integration; ten other PNG previews are readable. Original bytes remain unchanged.
