import { useState } from 'react';
import { useApp } from '../state/AppState.jsx';
export function DependencyAssumptions(){
 const app=useApp(),edges=app.data.dataset.commercialEdges,[selection,setSelection]=useState('');
 const edge=edges.find(e=>e.id===selection)||edges[0];
 if(!edge)return null;
 const overrides=app.scenario.assumptionOverrides,override=overrides.find(o=>o.targetId===edge.id&&o.field==='dependencyWeight');
 const set=value=>{const n=Number(value);if(value===''||!Number.isFinite(n)||n<0||n>1)return;
  app.setScenario({...app.scenario,assumptionOverrides:[...overrides.filter(o=>!(o.targetId===edge.id&&o.field==='dependencyWeight')),{targetId:edge.id,field:'dependencyWeight',value:n,rationale:'User hypothetical effective commercial dependency; replacement already included',provenance:'assumed'}]});};
 const name=id=>app.data.dataset.companies.find(c=>c.id===id)?.name||id;
 return <section><h3>Hypothetical dependency assumption</h3><label>Commercial relationship<select value={edge.id} onChange={e=>setSelection(e.target.value)}>{edges.map(e=><option key={e.id} value={e.id}>{name(e.supplierCompanyId)} → {name(e.customerCompanyId)}</option>)}</select></label><label>Effective dependency weight (0–1)<input type="number" min="0" max="1" step="0.05" value={override?.value??edge.dependencyWeight??''} onChange={e=>set(e.target.value)}/></label><p>Source weight: {typeof edge.dependencyWeight === 'number' ? edge.dependencyWeight.toFixed(2) : 'Unknown'}. Draft weight: {typeof (override?.value ?? edge.dependencyWeight) === 'number' ? (override?.value ?? edge.dependencyWeight).toFixed(2) : 'Unknown'}. Replacement is already included; do not discount it again. This does not establish an alternative supplier.</p><button className="secondary" disabled={!overrides.some(o=>o.field==='dependencyWeight')} onClick={()=>app.setScenario({...app.scenario,assumptionOverrides:overrides.filter(o=>o.field!=='dependencyWeight')})}>Reset dependency assumptions</button></section>;
}
