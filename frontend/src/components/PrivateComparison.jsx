import { useState } from 'react';
import { cloudRequest } from '../services/live/supabase.js';
import { parseAmount } from '../services/portfolio.js';
import { Metrics,Notice } from '../components.jsx';
export function PrivateComparison({run}){
 const holdings=run.portfolioSnapshot.filter(h=>h.matchingStatus==='matched');
 const [from,setFrom]=useState(holdings[0]?.companyId||''),[to,setTo]=useState(holdings.at(-1)?.companyId||''),[amount,setAmount]=useState('1000000'),[result,setResult]=useState(null),[error,setError]=useState(''),[pending,setPending]=useState(false);
 const change=setter=>e=>{setter(e.target.value);setResult(null);};
 const compare=async()=>{setPending(true);setError('');setResult(null);try{setResult(await cloudRequest('/compare',{method:'POST',body:JSON.stringify({runId:run.id,fromCompanyId:from,toCompanyId:to,amount:parseAmount(amount),requestId:crypto.randomUUID()})}));}catch(e){setError(e.message);}finally{setPending(false);}};
 return <section><h3>Compare private allocation</h3><div className="fields"><label>Private transfer from<select disabled={pending} value={from} onChange={change(setFrom)}>{holdings.map(h=><option key={h.id} value={h.companyId}>{h.originalInputName}</option>)}</select></label><label>Private transfer to<select disabled={pending} value={to} onChange={change(setTo)}>{holdings.map(h=><option key={h.id} value={h.companyId}>{h.originalInputName}</option>)}</select></label><label>Private transfer amount (INR rupees)<input disabled={pending} value={amount} onChange={change(setAmount)}/></label></div><button disabled={pending} onClick={compare}>{pending?'Comparing...':'Compare private transfer'}</button>{error&&<Notice error>{error}</Notice>}{result&&<><Metrics run={result.proposed}/><p>The saved baseline, source evidence and scenario remain fixed. This proposed allocation is not saved automatically.</p></>}</section>;
}
