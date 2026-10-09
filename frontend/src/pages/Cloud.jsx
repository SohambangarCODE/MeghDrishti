import { useEffect, useRef, useState } from "react";
import { PrivateComparison } from "../components/PrivateComparison.jsx";
import { Link } from "react-router-dom";
import { useAuth } from "../state/AuthState.jsx";
import { useApp } from "../state/AppState.jsx";
import { cloudRequest } from "../services/live/supabase.js";
import { parseAmount } from "../services/portfolio.js";
import { Exports, Metrics, ResultsTable, Notice } from "../components.jsx";
export default function Cloud() {
  const auth = useAuth(),
    app = useApp(),
    [portfolios, setPortfolios] = useState([]),
    [runs, setRuns] = useState([]),
    [editor, setEditor] = useState(null),
    [run, setRun] = useState(app.activeCloudRun),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false),
    [deleteId, setDeleteId] = useState(null),
    requestId = useRef(crypto.randomUUID());
  const owner = useRef(null);
  owner.current = auth.session?.user.id;
  const refresh = async () => {
    const expected = owner.current;
    const [p, r] = await Promise.all([
      cloudRequest("/portfolios"),
      cloudRequest("/runs"),
    ]);
    if (expected === owner.current) {
      setPortfolios(p.portfolios);
      setRuns(r.runs);
    }
  };
  const act = async (fn) => {
    const expected = owner.current;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await fn(() => expected === owner.current);
    } catch (e) {
      if (expected === owner.current) setError(e.message);
    } finally {
      if (expected === owner.current) setPending(false);
    }
  };
  useEffect(() => {
    setPortfolios([]);
    setRuns([]);
    setEditor(null);
    setRun(app.activeCloudRun);
    setDeleteId(null);
    setMessage("");
    setError("");
    setPending(false);
    if (auth.session)
      act(async (current) => {
        const [p, r] = await Promise.all([
          cloudRequest("/portfolios"),
          cloudRequest("/runs"),
        ]);
        if (current()) {
          setPortfolios(p.portfolios);
          setRuns(r.runs);
        }
      });
  }, [auth.session?.user.id]);
  if (!auth.ready) return <Notice>Restoring session...</Notice>;
  if (!auth.session)
    return (
      <>
        <h1>Private cloud workspace</h1>
        <Notice>
          {auth.configured
            ? "Sign in to access private records."
            : "Supabase is not configured. The local demo remains available."}
        </Notice>
        <Link to="/auth">Sign in</Link>
      </>
    );
  const save = () =>
    act(async (current) => {
      const body = await cloudRequest("/portfolios", {
        method: "POST",
        body: JSON.stringify({
          id: editor.id,
          name: editor.name,
          holdings: editor.draft.holdings,
          scenario: editor.draft.scenario,
        }),
      });
      if (current()) {
        setEditor(body.portfolio);
        requestId.current = crypto.randomUUID();
        await refresh();
        setMessage("Portfolio and assumptions saved atomically in Supabase.");
      }
    });
  return (
    <>
      <h1>Private cloud workspace</h1>
      <Notice>
        Signed in as {auth.session.user.email}. Cloud records stay separate from
        local demo reports. Dataset provenance remains unchanged when saved.
      </Notice>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <div className="actions">
        <button
          disabled={pending}
          onClick={() => {
            setEditor({
              id: crypto.randomUUID(),
              name: "Imported demo portfolio",
              draft: {
                holdings: structuredClone(app.holdings),
                scenario: structuredClone(app.scenario),
              },
            });
            setMessage(
              "Draft copied into this editor only. Save explicitly to upload.",
            );
          }}
        >
          Import current demo draft into editor
        </button>
        <button
          className="secondary"
          disabled={pending}
          onClick={() =>
            act(async () => {
              await refresh();
              setMessage("Private records refreshed.");
            })
          }
        >
          Refresh cloud records
        </button>
      </div>
      <section>
        <h2>Private portfolios</h2>
        {portfolios.length ? (
          portfolios.map((p) => (
            <div className="actions" key={p.id}>
              <button
                className="secondary"
                disabled={pending}
                onClick={() => {
                  setEditor(structuredClone(p));
                  setRun(null);
                  requestId.current = crypto.randomUUID();
                }}
              >
                {p.name}
              </button>
              <span>{p.dataset_version}</span>
              <button
                className="secondary"
                disabled={pending}
                onClick={() => setDeleteId(p.id)}
              >
                Delete portfolio and reports
              </button>
            </div>
          ))
        ) : (
          <p>No private portfolios yet. Use Import current demo draft into editor above, then Save private portfolio to create your first saved portfolio.</p>
        )}
      </section>
      {deleteId && (
        <Notice>
          Delete this private portfolio and all its saved reports?{" "}
          <button
            disabled={pending}
            onClick={() =>
              act(async (current) => {
                await cloudRequest("/portfolios/" + deleteId, {
                  method: "DELETE",
                });
                if (current()) {
                  setDeleteId(null);
                  setEditor(null);
                  setRun(null);
                  if (app.activeCloudRun?.portfolioId === deleteId) app.setActiveCloudRun(null);
                  await refresh();
                  setMessage("Private portfolio and reports deleted.");
                }
              })
            }
          >
            Confirm cloud deletion
          </button>
          <button className="secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </button>
        </Notice>
      )}
      {editor && (
        <section>
          <h2>Private portfolio editor</h2>
          <label>
            Portfolio name
            <input
              disabled={pending}
              value={editor.name}
              onChange={(e) => setEditor({ ...editor, name: e.target.value })}
            />
          </label>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Amount (INR rupees)</th>
                </tr>
              </thead>
              <tbody>
                {editor.draft.holdings.map((h, i) => (
                  <tr key={h.id}>
                    <th>{h.originalInputName}</th>
                    <td>
                      <input
                        disabled={pending}
                        aria-label={`Private amount for ${h.originalInputName}`}
                        value={h.amount}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            draft: {
                              ...editor.draft,
                              holdings: editor.draft.holdings.map((x, j) =>
                                j === i ? { ...x, amount: e.target.value } : x,
                              ),
                            },
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Scenario and evidence version:{" "}
            {editor.draft.scenario.datasetVersion}. Configure a different
            scenario in the demo before explicitly importing a new draft.
          </p>
          <div className="actions">
            <button
              disabled={pending}
              onClick={() => {
                try {
                  editor.draft.holdings = editor.draft.holdings.map((h) => ({
                    ...h,
                    amount: parseAmount(h.amount),
                  }));
                  save();
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Save private portfolio
            </button>
            <button
              disabled={pending || !portfolios.some((p) => p.id === editor.id)}
              onClick={() =>
                act(async (current) => {
                  const result = await cloudRequest("/analysis", {
                    method: "POST",
                    body: JSON.stringify({
                      portfolioId: editor.id,
                      requestId: requestId.current,
                    }),
                  });
                  if (current()) {
                    setRun(result.run);
                    await refresh();
                    setMessage(
                      "Analysis saved from the last cloud-saved portfolio. Unsaved editor changes were not included.",
                    );
                  }
                })
              }
            >
              Analyze last cloud-saved portfolio
            </button>
          </div>
        </section>
      )}
      <section>
        <h2>Private saved reports</h2>
        {runs.length ? (
          runs.map((r) => (
            <div className="actions" key={r.id}>
              <button
                className="secondary"
                disabled={pending}
                onClick={() =>
                  act(async (current) => {
                    const result = await cloudRequest("/runs/" + r.id);
                    if (current()) {
                      setRun(result.run);
                      app.setActiveCloudRun(result.run);
                      setMessage('Report loaded into main workspace. Go to Graph or Overview to inspect.');
                    }
                  })
                }
              >
                Open {r.created_at}
              </button>
              <button
                className="secondary"
                disabled={pending}
                onClick={() =>
                  act(async (current) => {
                    await cloudRequest("/runs/" + r.id, { method: "DELETE" });
                    if (current()) {
                      if (run?.id === r.id) setRun(null);
                      if (app.activeCloudRun?.id === r.id) app.setActiveCloudRun(null);
                      await refresh();
                      setMessage("Private report deleted.");
                    }
                  })
                }
              >
                Delete private report
              </button>
            </div>
          ))
        ) : (
          <p>No private analysis snapshots yet. Save a portfolio, then analyze the last cloud-saved portfolio.</p>
        )}
      </section>
      {run && (
        <section>
          <h2>Private immutable result</h2>
          {app.activeCloudRun?.id===run.id&&<div className="actions"><Link to="/graph">Inspect active private graph</Link><Link to="/overview">Inspect active private overview</Link><button onClick={()=>app.setActiveCloudRun(null)}>Return workspace to demo</button></div>}
          <p className="mono">
            {run.id} / {run.scenarioSnapshot.datasetVersion}
          </p>
          <Metrics run={run} />
          <ResultsTable run={run} />
          <Exports run={run} />
          <PrivateComparison key={run.id} run={run} />
        </section>
      )}
    </>
  );
}
