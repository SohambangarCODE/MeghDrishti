import {useEffect,useState} from 'react';
import {useAuth} from '../state/AuthState.jsx';
import {CoverageReport,getInstalledCoverage,summarizeCoverage} from '../services/coverage.js';
import {Notice} from '../components.jsx';
const populations={commercialEdges:'commercial relationships',routeUsage:'route usages'};

export function CoverageTable({dataset,privateRun}){
 const auth=useAuth(),[state,setState]=useState(null);
 const session=auth.session?`${auth.generation}:${auth.session.user.id}`:null;
 useEffect(()=>{
  let current=true;const controller=new AbortController();setState(null);
  (async()=>{
   try{
    if(!dataset)throw new Error('The immutable source snapshot is missing.');
    const summary=privateRun||!import.meta.env.VITE_API_BASE_URL?CoverageReport.parse(await summarizeCoverage(dataset)):await getInstalledCoverage(dataset.datasetVersion,controller.signal);
    if(summary.datasetVersion!==dataset.datasetVersion)throw new Error('Coverage response does not match the selected dataset.');
    if(current)setState({dataset,session,privateRun,summary});
   }catch(e){if(current)setState({dataset,session,privateRun,error:e.message});}
  })();
  return()=>{current=false;controller.abort();};
 },[dataset,privateRun,session]);
 // Never render a previous dataset/session result while the next effect is pending.
 const result=state?.dataset===dataset&&state?.session===session&&state?.privateRun===privateRun?state:null;
 return <section aria-label="Dataset completeness"><h2>Dataset completeness</h2>
  <p>{privateRun?'Private immutable source snapshot. Calculated in memory; never sent to the public coverage API.':'Selected installed dataset.'} Matching and computable demo parameters do not establish real operating coverage.</p>
  {!result&&<Notice>Loading completeness...</Notice>}
  {result?.error&&<Notice error>Coverage unavailable. {privateRun?'The saved source snapshot lacks sufficient compatible data; the current dataset is not substituted. ':''}{result.error}</Notice>}
  {result?.summary&&<><p>Coverage dataset: {result.summary.datasetVersion}</p><p className="mono">Content hash: {result.summary.contentHash}</p>
   <div className="table-scroll"><table><caption>Installed-record completeness, with explicit denominators</caption><thead><tr><th>Metric</th><th>Count / population</th><th>Coverage</th><th>Provenance and meaning</th></tr></thead><tbody>{result.summary.metrics.map(m=><tr key={m.id}><th scope="row">{m.label}</th><td>{m.numerator} / {m.denominator} {populations[m.population]||m.population}</td><td>{m.denominator?`${(100*m.numerator/m.denominator).toFixed(2)}%`:'Not applicable'}</td><td>{m.provenanceScope}. {m.definition}</td></tr>)}</tbody></table></div>
   <p>Unique records: {result.summary.counts.companies} companies, {result.summary.counts.commercialEdges} commercial relationships, {result.summary.counts.facilities} facilities, {result.summary.counts.routes} corridors, {result.summary.counts.routeUsage} route usages and {result.summary.counts.regions} regions.</p>
   <p>Company weather evidence: {result.summary.compatibility.companyWeather.status}. {result.summary.compatibility.companyWeather.reason}</p>
   <p>Future projection evidence: {result.summary.compatibility.futureProjections.status}. {result.summary.compatibility.futureProjections.reason}</p>
   <ul>{result.summary.limitations.map(s=><li key={s}>{s}</li>)}</ul>
  </>}
 </section>;
}
