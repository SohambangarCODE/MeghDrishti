import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState.jsx';
import { parseAmount } from '../services/portfolio.js';
import { Empty,Metrics,Notice,ResultsTable } from '../components.jsx';
export default function Compare() {
  const app=useApp(),[params]=useSearchParams(),runs=app.history.list();
  const [runId,setRunId]=useState(params.get('run')||runs[0]?.id||''),[from,setFrom]=useState('demo:aster'),[to,setTo]=useState('demo:evergreen'),[amount,setAmount]=useState('1000000'),[result,setResult]=useState(null),[error,setError]=useState(''),[pending,setPending]=useState(false);
  const run=app.history.get(runId);
  if(!run)return <><h1>Compare allocations</h1><Empty/></>;
  const compare=async()=>{setPending(true);setError('');setResult(null);try{setResult(await app.compare(run,from,to,parseAmount(amount)));}catch(e){setError(e.message);}finally{setPending(false);}};
  const change=setter=>e=>{setter(e.target.value);setResult(null);};
  return <><h1>Compare allocations</h1><p>Hypothetical sensitivity analysis with the baseline event, evidence, graph, and parameters held fixed.</p><label>Baseline snapshot<select disabled={pending} value={runId} onChange={change(setRunId)}>{runs.map(r=><option key={r.id} value={r.id}>{r.completedAt} · {r.id.slice(0,8)}</option>)}</select></label>
    <section><h2>Capital-preserving transfer</h2><div className="fields"><label>From holding<select disabled={pending} value={from} onChange={change(setFrom)}>{run.portfolioSnapshot.filter(h=>h.matchingStatus==='matched').map(h=><option key={h.id} value={h.companyId}>{h.originalInputName}</option>)}</select></label><label>To holding<select disabled={pending} value={to} onChange={change(setTo)}>{run.portfolioSnapshot.filter(h=>h.matchingStatus==='matched').map(h=><option key={h.id} value={h.companyId}>{h.originalInputName}</option>)}</select></label><label>Transfer amount (INR)<input disabled={pending} value={amount} onChange={change(setAmount)} inputMode="decimal"/></label></div><button disabled={pending} onClick={compare}>{pending?'Comparing…':'Compare transfer'}</button>{error&&<Notice error>{error}</Notice>}</section>
    <h2>Baseline</h2><Metrics run={run}/>{result&&<><h2>Proposed allocation</h2><Metrics run={result.proposed}/><ResultsTable run={result.proposed}/><Notice>Total capital preserved. Event, source snapshot and scenario remain fixed. Evergreen’s lack of a recorded path is not evidence that it is safe.</Notice><p className="mono">Fixed inputs: {result.fixedInputHash}</p><div className="actions"><button onClick={()=>{app.setHoldings(result.proposed.portfolioSnapshot);setResult(null);}}>Apply allocation to draft</button><button className="secondary" onClick={()=>setResult(null)}>Reset comparison</button></div></>}
  </>;
}
