import { useEffect,useRef,useState } from "react";
import { Link,useSearchParams } from "react-router-dom";
import { useApp } from "../state/AppState.jsx";
import { parseAmount } from "../services/portfolio.js";
import {
  Empty,
  Metrics,
  Notice,
  ResultsTable,
  money,
  stress,
} from "../components.jsx";
export default function Compare() {
  const app=useApp(),[params,setParams]=useSearchParams();
  const runs=[...new Map([app.activeCloudRun,...app.history.list()].filter(Boolean).map(r=>[r.id,r])).values()];
  // Prefer the active private snapshot even if a local record happens to share its ID.
  if(app.activeCloudRun){const index=runs.findIndex(r=>r.id===app.activeCloudRun.id);runs[index]=app.activeCloudRun;}
  const runId=params.get('run')||app.activeCloudRun?.id||runs[0]?.id||'',run=app.getRun(runId);
  if(!run)return <><h1>Compare allocations</h1><p>Open the intended saved snapshot from <Link to="/reports">Reports</Link> before comparing. No different baseline is selected automatically.</p><Empty/></>;
  return <Comparison key={run.id} app={app} run={run} runs={runs} selectRun={id=>setParams({run:id})}/>;
}
function Comparison({app,run,runs,selectRun}){
  const matched=run.portfolioSnapshot.filter(h=>h.matchingStatus==='matched');
  const defaultFrom=matched.find(h=>h.companyId==='demo:aster')?.companyId||matched[1]?.companyId||matched[0]?.companyId||'';
  const [from,setFrom]=useState(defaultFrom),
    [to, setTo] = useState(matched.findLast(h=>h.companyId!==defaultFrom)?.companyId||''),
    [amount, setAmount] = useState("1000000"),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const request=useRef(0),busy=useRef(false),privateRun=app.isPrivateRun(run);
  useEffect(()=>()=>{request.current++;},[]);
  const compare = async () => {
    if(busy.current)return;
    const ticket=++request.current;busy.current=true;
    setPending(true);
    setError("");
    setResult(null);
    try {
      const proposed=await app.compare(run, from, to, parseAmount(amount));
      if(ticket===request.current)setResult(proposed);
    } catch (e) {
      if(ticket===request.current)setError(e.message);
    } finally {
      if(ticket===request.current){busy.current=false;setPending(false);}
    }
  };
  const change = (setter) => (e) => {
    setter(e.target.value);
    setResult(null);
  };
  return (
    <>
      <h1>Compare allocations</h1>
      <p>
        Hypothetical sensitivity analysis with the baseline event, evidence,
        graph, and parameters held fixed.
      </p>
      {privateRun&&<Notice>Private saved baseline. This hypothetical comparison changes neither your saved portfolio nor the original analysis. Assumed stress-weighted exposure is not predicted financial loss.</Notice>}
      <Link to={`/results/${run.id}`}>View selected baseline results</Link>
      <label>
        Baseline snapshot
        <select disabled={pending} value={run.id} onChange={e=>selectRun(e.target.value)}>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {app.isPrivateRun(r)?'Private':'Local demo'} · {r.completedAt} · {r.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <section>
        <h2>Capital-preserving transfer</h2>
        <div className="fields">
          <label>
            From holding
            <select disabled={pending} value={from} onChange={change(setFrom)}>
              {run.portfolioSnapshot
                .filter((h) => h.matchingStatus === "matched")
                .map((h) => (
                  <option key={h.id} value={h.companyId}>
                    {h.originalInputName}
                  </option>
                ))}
            </select>
          </label>
          <label>
            To holding
            <select disabled={pending} value={to} onChange={change(setTo)}>
              {run.portfolioSnapshot
                .filter((h) => h.matchingStatus === "matched")
                .map((h) => (
                  <option key={h.id} value={h.companyId}>
                    {h.originalInputName}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Transfer amount (INR)
            <input
              disabled={pending}
              value={amount}
              onChange={change(setAmount)}
              inputMode="decimal"
            />
          </label>
        </div>
        {matched.length<2&&<Notice>Two matched holdings are required for a transfer. Unsupported holdings remain in the baseline.</Notice>}
        <button disabled={pending||matched.length<2} onClick={compare}>
          {pending ? "Comparing…" : "Compare transfer"}
        </button>
        {error && <Notice error>{error}</Notice>}
      </section>
      <div className="allocation-grid">
        <section>
          <h2>Baseline</h2>
          <Metrics run={run} />
        </section>
        <section>
          <h2>Proposed allocation</h2>
          {result ? (
            <Metrics run={result.proposed} />
          ) : (
            <p>
              Compare a transfer to inspect the proposed allocation with
              identical model inputs.
            </p>
          )}
        </section>
      </div>
      {result && (
        <>
          <section>
            <h2>Holding-by-holding comparison matrix</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Holding</th>
                    <th>Baseline capital (INR)</th>
                    <th>Proposed capital (INR)</th>
                    <th>Fixed stress</th>
                  </tr>
                </thead>
                <tbody>
                  {run.holdingsResults.map((h) => (
                    <tr key={h.id}>
                      <th>{h.originalInputName}</th>
                      <td>{money(h.amount)}</td>
                      <td>
                        {money(
                          result.proposed.holdingsResults.find(
                            (p) => p.id === h.id,
                          )?.amount,
                        )}
                      </td>
                      <td>{stress(h.totalStress)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <ResultsTable run={result.proposed} />
          <Notice>
            Total capital preserved. Event, source snapshot and scenario remain
            fixed. A lack of a recorded path is not evidence of safety.
          </Notice>
          <p className="mono">Fixed inputs: {result.fixedInputHash}</p>
          <div className="actions">
            {!privateRun&&<button
              onClick={() => {
                app.setHoldings(result.proposed.portfolioSnapshot);
                setResult(null);
              }}
            >
              Apply allocation to draft
            </button>}
            <button className="secondary" onClick={() => setResult(null)}>
              Reset comparison
            </button>
          </div>
        </>
      )}
    </>
  );
}
