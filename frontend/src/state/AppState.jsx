import { createContext,useContext,useEffect,useRef,useState } from 'react';
import { MockRepository } from '../services/mock/MockRepository.js';
import { BrowserSimulationService } from '../services/mock/BrowserSimulationService.js';
import { FastApiSimulationService } from '../services/live/FastApiSimulationService.js';
import { RunHistory } from './history.js';
import { LatestRequest } from './latestRequest.js';
import { Scenario,Holding } from '../schemas/contracts.js';
const Context=createContext(null);
function storage() {try{return window.localStorage;}catch{return null;}}
function session() {try {let id=sessionStorage.getItem('meghdrishti:session');if(!id){id=crypto.randomUUID();sessionStorage.setItem('meghdrishti:session',id);}return id;}catch{return crypto.randomUUID();}}
export function AppState({children}) {
  const [data,setData]=useState(null),[holdings,setHoldings]=useState([]),[scenario,setScenario]=useState(null);
  const [error,setError]=useState(''),[amountErrors,setAmountErrors]=useState({}),[pending,setPending]=useState(false),[outdated,setOutdated]=useState(false),[historyRevision,setHistoryRevision]=useState(0);
  const validationError=Object.values(amountErrors).join(' ');
  const history=useRef(null),gate=useRef(new LatestRequest()),service=useRef(null);
  if(!history.current)history.current=new RunHistory(storage());
  if(!service.current)service.current=import.meta.env.VITE_API_BASE_URL?new FastApiSimulationService(import.meta.env.VITE_API_BASE_URL,session()):new BrowserSimulationService();
  useEffect(()=>{new MockRepository().load().then(f=>{
    let draft=null;
    try{const saved=storage()?.getItem('meghdrishti:draft:v1');if(saved){draft=JSON.parse(saved);draft.holdings=draft.holdings.map(h=>Holding.parse(h));draft.scenario=Scenario.parse(draft.scenario);if(draft.scenario.datasetVersion!==f.dataset.datasetVersion)throw new Error('Old dataset');}}
    catch{draft=null;history.current.warning='Saved draft was invalid or unavailable; reference demo loaded.';}
    setData(f);setHoldings(draft?.holdings??f.holdings);setScenario(draft?.scenario??f.scenario);
  }).catch(e=>setError(e.message));},[]);
  useEffect(()=>{if(!data||!scenario)return;try{storage()?.setItem('meghdrishti:draft:v1',JSON.stringify({holdings,scenario}));}catch{history.current.warning='Draft cannot be saved locally; using memory.';}},[data,holdings,scenario]);
  const edit=(setter,value)=>{gate.current.invalidate();setPending(false);setOutdated(true);setter(value);};
  const analyze=async()=>{
    if(pending||validationError)return null;setPending(true);setError('');let accepted=null;
    try {await gate.current.run(({signal,revision})=>service.current.analyze({dataset:data.dataset,holdings,scenario,requestId:crypto.randomUUID(),draftRevision:revision,signal}),run=>{
      history.current.save(run);setHistoryRevision(n=>n+1);setOutdated(false);setPending(false);accepted=run;
    });}catch(e){if(e.name!=='AbortError'){setError(e.message);setPending(false);}}
    return accepted;
  };
  return <Context.Provider value={{data,holdings,scenario,error,setError,validationError,
    setAmountError:(id,message)=>{gate.current.invalidate();setPending(false);setOutdated(true);setAmountErrors(old=>{const next={...old};if(message)next[id]=message;else delete next[id];return next;});},
    pending,outdated,history:history.current,historyRevision,
    engine:import.meta.env.VITE_API_BASE_URL?'FastAPI / NetworkX':'Browser demo',
    setHoldings:value=>{edit(setHoldings,value);setAmountErrors(old=>Object.fromEntries(Object.entries(old).filter(([id])=>value.some(h=>h.id===id))));},setScenario:value=>edit(setScenario,value),analyze,
    compare:(...args)=>service.current.compare(...args),reset:()=>{edit(setHoldings,structuredClone(data.holdings));setScenario(structuredClone(data.scenario));setAmountErrors({});}}}>{children}</Context.Provider>;
}
export const useApp=()=>useContext(Context);
