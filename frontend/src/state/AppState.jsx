import {createEntityEvidence} from '../services/evidence.js';
import { createContext,useContext,useEffect,useMemo,useRef,useState } from 'react';
import { FastApiRepository } from '../services/live/FastApiRepository.js';
import { MockRepository } from '../services/mock/MockRepository.js';
import { BrowserSimulationService } from '../services/mock/BrowserSimulationService.js';
import { FastApiSimulationService } from '../services/live/FastApiSimulationService.js';
import { RunHistory,isPrivateRun } from './history.js';
import { LatestRequest } from './latestRequest.js';
import { usePortfolioWorkspace } from './usePortfolioWorkspace.js';
import { useAuth } from './AuthState.jsx';
import { cloudRequest } from '../services/live/supabase.js';
import { requireSavedPortfolio,validatePrivateRun } from '../services/live/privateRuns.js';
import { validateTransfer,validatePrivateComparison } from '../services/live/privateCompare.js';
const Context=createContext(null);
function storage() {try{return window.localStorage;}catch{return null;}}
function session() {try {let id=sessionStorage.getItem('meghdrishti:session');if(!id){id=crypto.randomUUID();sessionStorage.setItem('meghdrishti:session',id);}return id;}catch{return crypto.randomUUID();}}
export function AppState({children}) {
  const auth=useAuth(),ownerId=auth.session?.user.id;
  const [cloudRun,setCloudRun]=useState(null);
  const activeCloudRun=ownerId&&cloudRun?.ownerId===ownerId?cloudRun:null;
  const setActiveCloudRun=run=>setCloudRun(ownerId&&run?.ownerId===ownerId?run:null);
  const sessionKey=ownerId?`${auth.generation}:${ownerId}`:null,sessionKeyRef=useRef(sessionKey),openRevision=useRef(0);
  sessionKeyRef.current=sessionKey;
  const openCloudReport=async id=>{
    const expected=sessionKey,revision=++openRevision.current;
    const result=await cloudRequest('/runs/'+encodeURIComponent(id));
    const run=validatePrivateRun(result,ownerId,id);
    if(expected!==sessionKeyRef.current||revision!==openRevision.current)return null;
    setActiveCloudRun(run);return run;
  };
  useEffect(()=>{setCloudRun(null);},[ownerId,auth.generation]);
  useEffect(()=>{const clear=()=>setCloudRun(null);window.addEventListener('meghdrishti:session-expired',clear);return()=>window.removeEventListener('meghdrishti:session-expired',clear);},[]);
  const [datasetId,setDatasetId]=useState(()=>{try{return storage()?.getItem('meghdrishti:dataset')||'reference';}catch{return 'reference';}}),[datasets,setDatasets]=useState([{id:'reference',label:'Fictional reference demo'}]),[loadingDataset,setLoadingDataset]=useState(false);
  const [data,setData]=useState(null);
  const repository=useRef(null);
  if(!repository.current)repository.current=import.meta.env.VITE_API_BASE_URL?new FastApiRepository(import.meta.env.VITE_API_BASE_URL):new MockRepository();
  const workspace=usePortfolioWorkspace({auth,data,loadDataset:id=>repository.current.load(id),activateDataset:fixture=>{setData(fixture);const id=datasets.find(d=>d.datasetVersion===fixture.dataset.datasetVersion)?.id||datasetId;setDatasetId(id);}});
  const holdings=workspace.holdings,scenario=workspace.scenario||data?.scenario;
  const editingEvidence=useMemo(()=>createEntityEvidence(data?.dataset),[data?.dataset]);
  const activeRunEvidence=useMemo(()=>activeCloudRun?createEntityEvidence(activeCloudRun.sourceSnapshot):null,[activeCloudRun?.sourceSnapshot,sessionKey]);
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
    const privateMode=workspace.portfolioMode==='private';
    if(privateMode)requireSavedPortfolio(workspace);
    if(pending||loadingDataset||validationError||workspace.isSaving||workspace.isLoadingPortfolio||workspace.isDeletingPortfolio)return null;setPending(true);setError('');let accepted=null;
    const expected=sessionKey;
    try {await gate.current.run(async({signal,revision})=>privateMode?
      validatePrivateRun(await cloudRequest('/analysis',{method:'POST',body:JSON.stringify({portfolioId:workspace.activePortfolioId,requestId:crypto.randomUUID()})}),ownerId):
      service.current.analyze({dataset:data.dataset,holdings,scenario,requestId:crypto.randomUUID(),draftRevision:revision,signal}),run=>{
      if(expected!==sessionKeyRef.current)return;
      if(privateMode){openRevision.current++;setActiveCloudRun(run);}else{setCloudRun(null);history.current.save(run);setHistoryRevision(n=>n+1);}
      setOutdated(false);setPending(false);accepted=run;
    });}catch(e){if(e.name!=='AbortError'){setError(e.message);setPending(false);}}
    return accepted;
  };
  return <Context.Provider value={{...workspace,data,holdings,scenario,error,setError,validationError,datasetId,datasets,loadingDataset,editingEvidence,activeRunEvidence,
    createPortfolio:()=>{const created=workspace.createPortfolio();if(created){gate.current.invalidate();setPending(false);setAmountErrors({});setCloudRun(null);}return created;},
    openPortfolio:async id=>{const opened=await workspace.openPortfolio(id);if(opened){gate.current.invalidate();setPending(false);setAmountErrors({});setCloudRun(null);}return opened;},
    deletePortfolio:async id=>{const deleted=await workspace.deletePortfolio(id);if(deleted){gate.current.invalidate();openRevision.current++;setPending(false);if(workspace.activePortfolioId===id)setAmountErrors({});if(activeCloudRun?.portfolioId===id)setCloudRun(null);}return deleted;},
    selectDataset:async id=>{const changed=await workspace.switchDataset(id);if(changed){gate.current.invalidate();setPending(false);setOutdated(true);setAmountErrors({});setCloudRun(null);}return changed;},
    setAmountError:(id,message)=>{gate.current.invalidate();setPending(false);setOutdated(true);setAmountErrors(old=>{const next={...old};if(message)next[id]=message;else delete next[id];return next;});},
    pending,outdated,history:history.current,historyRevision,activeCloudRun,setActiveCloudRun,openCloudReport,
    getRun:id=>activeCloudRun?.id===id?activeCloudRun:history.current.get(id),
    deleteReport:id=>{history.current.delete(id);setHistoryRevision(n=>n+1);},
    saveReport:run=>{history.current.save(run);setHistoryRevision(n=>n+1);},
    engine:import.meta.env.VITE_API_BASE_URL?'FastAPI / NetworkX':'Browser demo',
    setHoldings:value=>{edit(workspace.setHoldings,value);setAmountErrors(old=>Object.fromEntries(Object.entries(old).filter(([id])=>value.some(h=>h.id===id))));},setScenario:value=>edit(workspace.setScenario,value),analyze,
    explain:run=>isPrivateRun(run)?Promise.resolve({provider:'deterministic',providerStatus:'Private snapshot; no external explanation requested'}):service.current.request?service.current.request('/runs/'+encodeURIComponent(run.id)+'/explanation',{method:'POST'}):Promise.resolve({provider:'deterministic',providerStatus:'Browser demo; no external explanation requested'}),
    isPrivateRun,
    compare:async(run,fromCompanyId,toCompanyId,amount)=>{
      validateTransfer(run,fromCompanyId,toCompanyId,amount);
      if(!isPrivateRun(run))return service.current.compare(run,fromCompanyId,toCompanyId,amount);
      if(!ownerId||run.ownerId!==ownerId)throw new Error('Open a report belonging to your signed-in account.');
      const expected=sessionKey,body={runId:run.id,fromCompanyId,toCompanyId,amount,requestId:crypto.randomUUID()};
      const result=await cloudRequest('/compare',{method:'POST',body:JSON.stringify(body)});
      if(expected!==sessionKeyRef.current)throw new Error('Private session changed.');
      return validatePrivateComparison(result,run,body,ownerId);
    },reset:()=>{const loaded=workspace.loadSample();if(loaded){gate.current.invalidate();setPending(false);setOutdated(true);setAmountErrors({});setCloudRun(null);}return loaded;}}}>{children}</Context.Provider>;
}
export const useApp=()=>useContext(Context);
