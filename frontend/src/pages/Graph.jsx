import { useMemo,useState } from 'react';
import { ReactFlow,Background,Controls,MiniMap,MarkerType } from '@xyflow/react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState.jsx';
import { graphData,layoutGraph } from '../services/graph.js';
import { Notice,PathList,RunButton } from '../components.jsx';

export default function Graph() {
  const app=useApp(),[params]=useSearchParams(),run=app.history.get(params.get('run'))||app.history.list()[0];
  const [query,setQuery]=useState(''),[kind,setKind]=useState('all'),[affected,setAffected]=useState(false),[selected,setSelected]=useState(null),[path,setPath]=useState(null);
  const data=useMemo(()=>graphData(run?.sourceSnapshot||app.data.dataset,run?.portfolioSnapshot||app.holdings),[run?.id,app.data,app.holdings]);
  const activeEntity=selected||data.nodes.find(n=>n.id===params.get('entity'));
  const affectedIds=new Set(run?.paths.filter(p=>p.stress!==null).flatMap(p=>p.companyIds)||[]);
  const filtered=data.nodes.filter(n=>(kind==='all'||n.kind===kind)&&(!query||`${n.label} ${n.id}`.toLowerCase().includes(query.toLowerCase()))&&(!affected||affectedIds.has(n.id)));
  const ids=new Set(filtered.slice(0,100).map(n=>n.id));
  const positions=layoutGraph(data.nodes,data.edges);
  const nodes=positions.filter(n=>ids.has(n.id)).map(n=>({id:n.id,position:n.position,data:{label:<><strong>{n.label}</strong><br/><small>{n.kind}</small></>},style:{border:path?.companyIds.includes(n.id)?'3px solid #397d76':'1px solid #71717a'},ariaLabel:`${n.kind}: ${n.label}`}));
  const edges=data.edges.filter(e=>ids.has(e.sourceId)&&ids.has(e.targetId)).map(e=>({id:e.id,source:e.sourceId,target:e.targetId,label:e.kind,markerEnd:{type:MarkerType.ArrowClosed},style:{stroke:path?.edgeIds.includes(e.id)?'#397d76':'#a1a1aa',strokeWidth:path?.edgeIds.includes(e.id)?3:1},labelStyle:{fontSize:12}}));
  return <><h1>Exposure graph</h1><p>Arrows labelled supplies follow supplier → customer. Only those links count as commercial hops. View filters do not recalculate analysis.</p>
    {run&&<Notice>Showing snapshot {run.id.slice(0,8)} ({run.scenarioSnapshot.maxCommercialHops} hops). {app.outdated?'Draft has changed; rerun to update results.':''}</Notice>}
    <div className="fields"><label>Search entities<input value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Entity type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All types</option>{['company','facility','route','waypoint','commodity','region','hazard','portfolio'].map(k=><option key={k}>{k}</option>)}</select></label><label className="check"><input type="checkbox" checked={affected} onChange={e=>setAffected(e.target.checked)}/>Affected companies only</label></div>
    <div className="actions"><label>Draft commercial hop limit<select value={app.scenario.maxCommercialHops} onChange={e=>app.setScenario({...app.scenario,maxCommercialHops:Number(e.target.value)})}>{[1,2,3].map(n=><option key={n}>{n}</option>)}</select></label><RunButton/></div>
    {filtered.length>100&&<Notice>Display limited to 100 nodes. Refine filters; analytical results are unchanged.</Notice>}
    <div className="split"><div className="graph" aria-label="Operational dependency graph"><ReactFlow key={`${kind}-${affected}`} nodes={nodes} edges={edges} fitView minZoom={.1} nodesDraggable={false} nodesConnectable={false} onNodeClick={(_,n)=>setSelected(data.nodes.find(x=>x.id===n.id))}><Background/><Controls/><MiniMap/></ReactFlow></div>
    <section aria-live="polite"><h2>Entity evidence</h2>{activeEntity?<><h3>{activeEntity.label}</h3><p>{activeEntity.kind} · {activeEntity.record.provenance}</p><p className="mono">{activeEntity.id}</p><pre>{JSON.stringify(activeEntity.record,null,2)}</pre></>:<p>Select a node or a record below. Commodity links describe supplied items; they do not add another stress channel.</p>}</section></div>
    <section><h2>Readable graph alternative</h2><div className="table-scroll"><table><thead><tr><th>Entity</th><th>Role</th><th>Evidence</th></tr></thead><tbody>{filtered.map(n=><tr key={n.id}><th><button className="secondary" onClick={()=>setSelected(n)}>{n.label}</button></th><td>{n.kind}</td><td>{n.record.provenance}</td></tr>)}</tbody></table></div><h3>Directed relationships</h3><ul>{data.edges.filter(e=>ids.has(e.sourceId)&&ids.has(e.targetId)).map(e=><li key={e.id}>{data.nodes.find(n=>n.id===e.sourceId)?.label} → {data.nodes.find(n=>n.id===e.targetId)?.label}: {e.kind} ({e.commercialHop?'1 commercial hop':'not a commercial hop'})</li>)}</ul></section>
    {run&&<section><h2>Strongest and alternative paths</h2><PathList run={run} onSelect={setPath}/>{path&&<Notice>Selected: {path.companyIds.join(' → ')}. Evidence: {path.evidenceIds.join(', ')}</Notice>}</section>}
  </>;
}
