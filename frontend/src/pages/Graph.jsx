import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Position,
} from "@xyflow/react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../state/AppState.jsx";
import { graphData, layoutGraph } from "../services/graph.js";
import { Notice, PathList, RunButton } from "../components.jsx";

export default function Graph() {
  const app = useApp(),
    [params] = useSearchParams(),
    run =
      app.history.get(params.get("run")) ||
      app.history
        .list()
        .find(
          (r) =>
            r.scenarioSnapshot.datasetVersion ===
            app.data.dataset.datasetVersion,
        );
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState("all"),
    [affected, setAffected] = useState(false),
    [selected, setSelected] = useState(null),
    [path, setPath] = useState(null),
    [scope, setScope] = useState("portfolio");
  const data = useMemo(
    () =>
      graphData(
        run?.sourceSnapshot || app.data.dataset,
        run?.portfolioSnapshot || app.holdings,
      ),
    [run?.id, app.data, app.holdings],
  );
  const activeEntity =
    selected || data.nodes.find((n) => n.id === params.get("entity"));
  const affectedIds = new Set(
    run?.paths.filter((p) => p.stress !== null).flatMap((p) => p.companyIds) ||
      [],
  );
  const heldIds = new Set(
    (run?.portfolioSnapshot || app.holdings)
      .filter((h) => h.matchingStatus === "matched")
      .map((h) => h.companyId),
  );
  const focusIds = new Set(heldIds);
  if (run)
    run.paths
      .filter((p) =>
        run.holdingsResults.some((h) => h.selectedPathIds.includes(p.id)),
      )
      .forEach((p) => p.companyIds.forEach((id) => focusIds.add(id)));
  else
    for (let i = 0; i < 3; i++)
      for (const edge of data.edges.filter((e) => e.commercialHop))
        if (focusIds.has(edge.targetId)) focusIds.add(edge.sourceId);
  if (params.get("entity")) focusIds.add(params.get("entity"));
  const pathIds = new Set(path?.companyIds || []);
  const filtered = data.nodes.filter(
    (n) =>
      (scope === "all" || (path ? pathIds.has(n.id) : focusIds.has(n.id))) &&
      (kind === "all" || n.kind === kind) &&
      (!query ||
        `${n.label} ${n.id}`.toLowerCase().includes(query.toLowerCase())) &&
      (!affected || affectedIds.has(n.id)),
  );
  const visible = filtered.slice(0, 40),
    ids = new Set(visible.map((n) => n.id));
  const visibleEdges = data.edges.filter(
    (e) =>
      ids.has(e.sourceId) &&
      ids.has(e.targetId) &&
      (!path || scope === "all" || path.edgeIds.includes(e.id)),
  );
  const positions = layoutGraph(visible, visibleEdges);
  const colors = {
    company: "#397d76",
    facility: "#b8560d",
    route: "#2563eb",
    hazard: "#b42318",
    region: "#77717b",
    commodity: "#8054a1",
    waypoint: "#77717b",
    portfolio: "#18181b",
  };
  const nodes = positions.map((n) => {
    const exposure = run?.holdingsResults.find((h) => h.companyId === n.id);
    return {
      id: n.id,
      position: n.position,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: (
          <div className="exposure-node">
            <span className="node-role">
              {heldIds.has(n.id)
                ? "Portfolio holding"
                : n.kind === "company"
                  ? "Supply-chain company"
                  : n.kind}
            </span>
            <strong>{n.label}</strong>
            {exposure && (
              <span className="node-metric">
                {exposure.totalStress === null
                  ? "Stress unknown"
                  : `${(exposure.totalStress * 100).toFixed(2)} / 100 stress`}
              </span>
            )}
          </div>
        ),
      },
      style: {
        border: `${activeEntity?.id === n.id ? 3 : 1}px solid ${colors[n.kind] || "#71717a"}`,
        borderLeft: `5px solid ${colors[n.kind] || "#71717a"}`,
        background: heldIds.has(n.id) ? "#edf5f4" : "white",
      },
      ariaLabel: `${n.kind}: ${n.label}`,
    };
  });
  const edges = visibleEdges.map((e) => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    type: "smoothstep",
    label: e.commercialHop ? undefined : e.kind.replaceAll("_", " "),
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: e.commercialHop ? "#397d76" : "#aaa5ae",
      strokeWidth: e.commercialHop ? 2.5 : 1,
      strokeDasharray: e.commercialHop ? undefined : "5 5",
    },
    labelStyle: { fontSize: 10 },
    labelBgStyle: { fill: "#fff" },
  }));
  const viewKey =
    visible.map((n) => n.id).join("|") +
    visibleEdges.map((e) => e.id).join("|");
  return (
    <>
      <h1>Exposure graph</h1>
      <p>
        Arrows labelled supplies follow supplier → customer. Only those links
        count as commercial hops. View filters do not recalculate analysis.
      </p>
      {run && (
        <Notice>
          Showing snapshot {run.id.slice(0, 8)} (
          {run.scenarioSnapshot.maxCommercialHops} hops).{" "}
          {app.outdated ? "Draft has changed; rerun to update results." : ""}
        </Notice>
      )}
      <div className="actions" role="group" aria-label="Graph scope">
        <button
          aria-pressed={scope === "portfolio"}
          className={scope === "portfolio" ? "" : "secondary"}
          onClick={() => {
            setScope("portfolio");
            setPath(null);
            setKind("all");
            setQuery("");
          }}
        >
          Portfolio dependencies
        </button>
        <button
          aria-pressed={scope === "all"}
          className={scope === "all" ? "" : "secondary"}
          onClick={() => {
            setScope("all");
            setPath(null);
          }}
        >
          Explore all entities
        </button>
        {path && (
          <button className="secondary" onClick={() => setPath(null)}>
            Clear path focus
          </button>
        )}
      </div>
      <p className="graph-legend">
        <span>━━ Supplier → customer</span>
        <span>┄┄ Operational / context link</span>
        <span>Green cards: portfolio holdings</span>
      </p>
      {path && (
        <Notice>
          Focused propagation path:{" "}
          {path.companyIds
            .map((id) => data.nodes.find((n) => n.id === id)?.label || id)
            .join(" → ")}
        </Notice>
      )}
      <div className="fields">
        <label>
          Search entities
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setScope("all");
              setPath(null);
            }}
          />
        </label>
        <label>
          Entity type
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setScope("all");
              setPath(null);
            }}
          >
            <option value="all">All types</option>
            {[
              "company",
              "facility",
              "route",
              "waypoint",
              "commodity",
              "region",
              "hazard",
              "portfolio",
            ].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={affected}
            onChange={(e) => setAffected(e.target.checked)}
          />
          Affected companies only
        </label>
      </div>
      <div className="actions">
        <label>
          Draft commercial hop limit
          <select
            value={app.scenario.maxCommercialHops}
            onChange={(e) =>
              app.setScenario({
                ...app.scenario,
                maxCommercialHops: Number(e.target.value),
              })
            }
          >
            {[1, 2, 3].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <RunButton />
      </div>
      <p>
        {visible.length} visible entities · {visibleEdges.length} links. Read
        left to right. Select a path below to isolate its companies.
      </p>
      {filtered.length > 40 && (
        <Notice>
          Showing 40 of {filtered.length} matching entities. Search or select an
          entity type to narrow the view; calculations still use the complete
          dataset.
        </Notice>
      )}
      {!visible.length && (
        <Notice>
          No entities match these filters. Clear the search or choose Portfolio
          dependencies.
        </Notice>
      )}
      <div className="graph-workspace">
        <div className="graph" aria-label="Operational dependency graph">
          <ReactFlow
            key={viewKey}
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.15}
            maxZoom={1.8}
            nodesDraggable={false}
            nodesConnectable={false}
            onNodeClick={(_, n) =>
              setSelected(data.nodes.find((x) => x.id === n.id))
            }
          >
            <Background color="#ddd9df" gap={24} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <section className="graph-inspector" aria-live="polite">
          <h2>Entity evidence</h2>
          {activeEntity ? (
            <>
              <h3>{activeEntity.label}</h3>
              <p>
                {activeEntity.kind} · {activeEntity.record.provenance}
              </p>
              <p className="mono">{activeEntity.id}</p>
              <details open>
                <summary>Source record and assumptions</summary>
                <pre>{JSON.stringify(activeEntity.record, null, 2)}</pre>
              </details>
            </>
          ) : (
            <p>
              Select a node or a record below. Commodity links describe supplied
              items; they do not add another stress channel.
            </p>
          )}
        </section>
      </div>
      <details className="graph-records" open>
        <summary>Browse entities and directed relationships</summary>
        <section>
          <h2>Readable graph alternative</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Role</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <tr key={n.id}>
                    <th>
                      <button
                        className="secondary"
                        onClick={() => setSelected(n)}
                      >
                        {n.label}
                      </button>
                    </th>
                    <td>{n.kind}</td>
                    <td>{n.record.provenance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Directed relationships</h3>
          <ul>
            {data.edges
              .filter((e) => ids.has(e.sourceId) && ids.has(e.targetId))
              .map((e) => (
                <li key={e.id}>
                  {data.nodes.find((n) => n.id === e.sourceId)?.label} →{" "}
                  {data.nodes.find((n) => n.id === e.targetId)?.label}: {e.kind}{" "}
                  (
                  {e.commercialHop
                    ? "1 commercial hop"
                    : "not a commercial hop"}
                  )
                </li>
              ))}
          </ul>
        </section>
      </details>
      {run && (
        <section>
          <h2>Strongest and alternative paths</h2>
          <PathList
            run={run}
            onSelect={(p) => {
              setPath(p);
              setScope("portfolio");
              setKind("all");
              setQuery("");
              setAffected(false);
            }}
          />
          {path && (
            <Notice>
              Selected: {path.companyIds.join(" → ")}. Evidence:{" "}
              {path.evidenceIds.join(", ")}
            </Notice>
          )}
        </section>
      )}
    </>
  );
}
