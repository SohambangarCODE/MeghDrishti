import { createContext,useContext,useEffect,useRef,useState } from 'react';
import { FastApiRepository } from '../services/live/FastApiRepository.js';
import { MockRepository } from '../services/mock/MockRepository.js';
import { BrowserSimulationService } from '../services/mock/BrowserSimulationService.js';
import { FastApiSimulationService } from '../services/live/FastApiSimulationService.js';
import { RunHistory } from './history.js';
import { LatestRequest } from './latestRequest.js';
import { usePortfolioWorkspace } from './usePortfolioWorkspace.js';
import { useAuth } from './AuthState.jsx';
const Context=createContext(null);
function storage() {try{return window.localStorage;}catch{return null;}}
function session() {try {let id=sessionStorage.getItem('meghdrishti:session');if(!id){id=crypto.randomUUID();sessionStorage.setItem('meghdrishti:session',id);}return id;}catch{return crypto.randomUUID();}}
export function AppState({children}) {
  const auth=useAuth(),ownerId=auth.session?.user.id;
  const [cloudRun,setCloudRun]=useState(null);
  const activeCloudRun=ownerId&&cloudRun?.ownerId===ownerId?cloudRun:null;
  const setActiveCloudRun=run=>setCloudRun(ownerId&&run?.ownerId===ownerId?run:null);
  useEffect(()=>{setCloudRun(null);},[ownerId,auth.generation]);
  useEffect(()=>{const clear=()=>setCloudRun(null);window.addEventListener('meghdrishti:session-expired',clear);return()=>window.removeEventListener('meghdrishti:session-expired',clear);},[]);
  const [datasetId,setDatasetId]=useState(()=>{try{return storage()?.getItem('meghdrishti:dataset')||'reference';}catch{return 'reference';}}),[datasets,setDatasets]=useState([{id:'reference',label:'Fictional reference demo'}]),[loadingDataset,setLoadingDataset]=useState(false);
  const [data,setData]=useState(null);
  const repository=useRef(null);
  if(!repository.current)repository.current=import.meta.env.VITE_API_BASE_URL?new FastApiRepository(import.meta.env.VITE_API_BASE_URL):new MockRepository();
  const workspace=usePortfolioWorkspace({auth,data,loadDataset:id=>repository.current.load(id),activateDataset:fixture=>{setData(fixture);const id=datasets.find(d=>d.datasetVersion===fixture.dataset.datasetVersion)?.id||datasetId;setDatasetId(id);}});
  const holdings=workspace.holdings,scenario=workspace.scenario||data?.scenario;
  const [error,setError]=useState(''),[amountErrors,setAmountErrors]=useState({}),[pending,setPending]=useState(false),[outdated,setOutdated]=useState(false),[historyRevision,setHistoryRevision]=useState(0);
  const validationError=Object.values(amountErrors).join(' ');
  const history=useRef(null),gate=useRef(new LatestRequest()),service=useRef(null);
  if(!history.current)history.current=new RunHistory(storage());
  if(!service.current)service.current=import.meta.env.VITE_API_BASE_URL?new FastApiSimulationService(import.meta.env.VITE_API_BASE_URL,session()):new BrowserSimulationService();
  // Previous releases persisted drafts without account scope. Never restore those drafts.
  useEffect(()=>{try{const saved=storage();if(saved)Object.keys(saved).filter(key=>key.startsWith('meghdrishti:draft:')).forEach(key=>saved.removeItem(key));}catch{}},[]);
  useEffect(()=>{let active=true;setLoadingDataset(true);setError('');if(repository.current.catalog)repository.current.catalog().then(rows=>{if(active)setDatasets(rows);}).catch(e=>{if(active)setError(e.message);});repository.current.load(datasetId).then(f=>{if(active){setData(f);setLoadingDataset(false);}}).catch(e=>{if(active){setError(e.message);setLoadingDataset(false);}});return()=>{active=false;};},[datasetId]);
  useEffect(()=>{gate.current.invalidate();setPending(false);setAmountErrors({});setError('');setOutdated(false);},[ownerId,auth.generation]);
  const edit=(setter,value)=>{gate.current.invalidate();setPending(false);setOutdated(true);setter(value);};
  const analyze=async()=>{
    if(pending||loadingDataset||validationError||workspace.portfolioMode!=='sample')return null;setPending(true);setError('');let accepted=null;
    try {await gate.current.run(({signal,revision})=>service.current.analyze({dataset:data.dataset,holdings,scenario,requestId:crypto.randomUUID(),draftRevision:revision,signal}),run=>{
      history.current.save(run);setHistoryRevision(n=>n+1);setOutdated(false);setPending(false);accepted=run;
    });}catch(e){if(e.name!=='AbortError'){setError(e.message);setPending(false);}}
    return accepted;
  };
  return <Context.Provider value={{...workspace,data,holdings,scenario,error,setError,validationError,datasetId,datasets,loadingDataset,
    createPortfolio:()=>{const created=workspace.createPortfolio();if(created){gate.current.invalidate();setPending(false);setAmountErrors({});setCloudRun(null);}return created;},
    openPortfolio:async id=>{const opened=await workspace.openPortfolio(id);if(opened){gate.current.invalidate();setPending(false);setAmountErrors({});setCloudRun(null);}return opened;},
    selectDataset:async id=>{const changed=await workspace.switchDataset(id);if(changed){gate.current.invalidate();setPending(false);setOutdated(true);setAmountErrors({});setCloudRun(null);}return changed;},
    setAmountError:(id,message)=>{gate.current.invalidate();setPending(false);setOutdated(true);setAmountErrors(old=>{const next={...old};if(message)next[id]=message;else delete next[id];return next;});},
    pending,outdated,history:history.current,historyRevision,activeCloudRun,setActiveCloudRun,
    deleteReport:id=>{history.current.delete(id);setHistoryRevision(n=>n+1);},
    saveReport:run=>{history.current.save(run);setHistoryRevision(n=>n+1);},
    engine:import.meta.env.VITE_API_BASE_URL?'FastAPI / NetworkX':'Browser demo',
    setHoldings:value=>{edit(workspace.setHoldings,value);setAmountErrors(old=>Object.fromEntries(Object.entries(old).filter(([id])=>value.some(h=>h.id===id))));},setScenario:value=>edit(workspace.setScenario,value),analyze,
    explain:run=>service.current.request?service.current.request('/runs/'+encodeURIComponent(run.id)+'/explanation',{method:'POST'}):Promise.resolve({provider:'deterministic',providerStatus:'Browser demo; no external explanation requested'}),
    compare:(...args)=>service.current.compare(...args),reset:()=>{const loaded=workspace.loadSample();if(loaded){gate.current.invalidate();setPending(false);setOutdated(true);setAmountErrors({});setCloudRun(null);}return loaded;}}}>{children}</Context.Provider>;
}
export const useApp=()=>useContext(Context);
