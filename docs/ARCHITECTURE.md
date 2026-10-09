# Architecture

`backend/app/engine.py` is the authoritative integrated engine. Pydantic validates incoming contracts; NetworkX MultiDiGraph retains parallel commercial relationships. Facility/route mapping produces seeds before commercial traversal. Simple paths are bounded to the reverse portfolio dependency subgraph and at most three commercial hops. A path limit emits an explicit partial-result warning.

The React UI delegates to `BrowserSimulationService` by default or `FastApiSimulationService` when `VITE_API_BASE_URL` is configured. No calculation is embedded in page components. `frontend/src/engine/demo/simulate.js` implements the credential-free reference mechanism; cross-language tests compare paths, coverage, holdings and totals for seven fixture variants.

`MockRepository` and Python `DemoRepository` supply immutable copies of the fixture. Supabase adapters are a separate persistence boundary. Backend demo runs are bounded process memory, scoped by a random client session capability; this is not production authentication. JWT authentication verifies issuer, audience, expiry, role and current signing keys when configured. Supabase requests use user JWTs so RLS remains active.

Runs capture holdings, scenario, raw dataset, effective events, seeds, paths, assumptions and source versions. The source snapshot stays raw; assumption overlays apply to a copy. Allocation comparison uses the baseline source/scenario snapshots. SHA-256 hashes identify inputs. Browser and Python canonicalization implementations are individually deterministic but hashes are not asserted identical across languages; arithmetic/path parity is asserted. Persisted run identity is engine-specific.

Draft edits increment a revision and invalidate pending requests. Response acceptance also checks an operation sequence; both obsolete successes and errors are discarded. Backend run creation requires an idempotency key and rejects reuse with different inputs. Exact CORS origins are configurable.

Frontend routes match P01–P11. The current UI is intentionally a simple development shell. Future Stitch files should remain unmodified under `frontend/stitch-export/`, then map to reusable presentation components without changing services/contracts. Graph filters and layout operate after analysis and do not affect metrics. A graph/table alternative, chart/table pair and offline location list expose the same underlying records.

Browser history stores at most 20 validated synthetic snapshots; failures use in-memory fallback. Drafts are validated on restore. There is no persistent authenticated portfolio cache. JSON exports include complete snapshots; CSV includes source labels, assumptions, exclusions and formula-prefix protection. Print uses the result page with navigation hidden.

Engine limits: 1,000 companies, 10,000 commercial edges, 10,000 enumerated paths; graph view displays at most 100 nodes. Default fixture: five companies, three commercial edges, four holdings, one facility, one route. Larger-network performance is not claimed.

Build compatibility: Vite 7.3.7 and Vitest 4.1.11 are resolved in the lockfile. Tailwind 4.1.18 uses a small Vite adapter calling its pure `compile`/`build` API and scanning local source candidates. The standard Tailwind Node plugin's ESM reload hooks stalled even outside the sandbox on this host. The adapter avoids those hooks without patching dependencies or keeping Tailwind 3's vulnerable transitive tree. JSX/style sources are watched; restart the dev server after adding entirely new source directories. Graph, map, authentication and chart pages load on demand.
