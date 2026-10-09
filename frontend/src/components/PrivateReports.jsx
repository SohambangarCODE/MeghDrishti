import {useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../state/AuthState.jsx';
import {useApp} from '../state/AppState.jsx';
import {cloudRequest} from '../services/live/supabase.js';
import {Notice} from '../components.jsx';

export function PrivateReports(){
 const auth=useAuth(),app=useApp(),navigate=useNavigate();
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[pending,setPending]=useState(''),[error,setError]=useState(''),[deleting,setDeleting]=useState(null);
 const lifetime=useRef(0),request=useRef(0);
 const refresh=async()=>{
  const expected=lifetime.current,ticket=++request.current;setLoading(true);setError('');
  try{
   const result=await cloudRequest('/runs');
   if(result.schemaVersion!=='1.0.0'||!Array.isArray(result.runs)||result.runs.some(r=>typeof r.id!=='string'||typeof r.created_at!=='string'||typeof r.portfolio_id!=='string'))throw new Error('Invalid private report list response.');
   if(expected===lifetime.current&&ticket===request.current)setRows(result.runs);
  }catch(e){if(expected===lifetime.current&&ticket===request.current)setError(e.message);}
  finally{if(expected===lifetime.current&&ticket===request.current)setLoading(false);}
 };
 useEffect(()=>{
  lifetime.current++;setRows([]);setPending('');setDeleting(null);setError('');
  if(auth.session)void refresh();else setLoading(false);
  return()=>{lifetime.current++;request.current++;};
 },[auth.session?.user.id,auth.generation]);
 const open=async id=>{
  const expected=lifetime.current;setPending(id);setError('');
  try{const run=await app.openCloudReport(id);if(run&&expected===lifetime.current)navigate('/results/'+encodeURIComponent(run.id));}
  catch(e){if(expected===lifetime.current)setError('Open failed. '+e.message);}
  finally{if(expected===lifetime.current)setPending('');}
 };
 const remove=async id=>{
  const expected=lifetime.current;setPending(id);setError('');
  try{
   const result=await cloudRequest('/runs/'+encodeURIComponent(id),{method:'DELETE'});
   if(result.deleted!==id)throw new Error('Deletion was not confirmed by the server.');
   if(expected!==lifetime.current)return;
   setRows(previous=>previous.filter(r=>r.id!==id));setDeleting(null);
   if(app.activeCloudRun?.id===id)app.setActiveCloudRun(null);
  }catch(e){if(expected===lifetime.current)setError('Delete failed. '+e.message);}
  finally{if(expected===lifetime.current)setPending('');}
 };
 if(!auth.session)return null;
 return <section aria-label="Private cloud reports"><div className="page-heading"><h2>Private cloud reports</h2><button className="secondary" disabled={loading||!!pending} onClick={refresh}>Refresh private reports</button></div>
  <p>Saved analyses belong to your signed-in account. Opening keeps the snapshot in memory; logout clears it. Private reports are never saved in local demo history.</p>
  {error&&<Notice error>{error}</Notice>}{loading?<Notice>Loading private reports...</Notice>:!rows.length?<p>No private cloud reports yet. Save a portfolio and analyze it to create one.</p>:<div className="report-list">{rows.map(r=><article key={r.id} className="report-row"><div><h3>{r.created_at}</h3><p className="mono">{r.id}</p><p>Portfolio: {r.portfolio_id}</p></div><div className="actions"><button disabled={!!pending} aria-label={`Open private report ${r.id}`} onClick={()=>open(r.id)}>Open</button>{deleting===r.id?<><span>Delete this private report permanently?</span><button disabled={!!pending} onClick={()=>remove(r.id)}>Confirm private report deletion</button><button className="secondary" disabled={!!pending} onClick={()=>setDeleting(null)}>Cancel</button></>:<button className="secondary" disabled={!!pending} aria-label={`Delete private report ${r.id}`} onClick={()=>setDeleting(r.id)}>Delete</button>}</div></article>)}</div>}
  {pending&&<Notice>Processing private report...</Notice>}
 </section>;
}
