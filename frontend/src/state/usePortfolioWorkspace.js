import {useEffect,useRef,useState} from 'react';
import {cloudRequest} from '../services/live/supabase.js';
import {PrivatePortfolio,portfolioWrite} from '../services/live/privatePortfolios.js';
import {Scenario} from '../schemas/contracts.js';

const empty=(key,scenario=null)=>({key,id:crypto.randomUUID(),name:'',holdings:[],scenario,mode:'private',dirty:false,lastSavedAt:null,revision:0,saved:false});

export function usePortfolioWorkspace({auth,data,loadDataset,activateDataset}){
 const key=auth.session?`${auth.generation}:${auth.session.user.id}`:null;
 const [draft,setDraft]=useState(()=>empty(null)),[portfolios,setPortfolios]=useState([]),
  [isSaving,setSaving]=useState(false),[isLoadingPortfolio,setLoading]=useState(false),[isListing,setListing]=useState(false),
  [saveError,setSaveError]=useState(''),[loadError,setLoadError]=useState(''),[listError,setListError]=useState(''),
  [isDeletingPortfolio,setDeleting]=useState(false),[deleteError,setDeleteError]=useState('');
 const sessionKey=useRef(key),operation=useRef(0),listRevision=useRef(0),busy=useRef(false),draftRef=useRef(draft);
 sessionKey.current=key;draftRef.current=draft;
 const belongs=!!key&&draft.key===key;
 const current=belongs?draft:{...draft,id:null,name:'',holdings:[],scenario:null,lastSavedAt:null,dirty:false,saved:false,mode:'private'};
 const refreshPortfolios=async()=>{
  if(!key)return;
  const expected=key,request=++listRevision.current;setListing(true);setListError('');
  try{
   const result=await cloudRequest('/portfolios');
   if(result.schemaVersion!=='1.0.0'||!Array.isArray(result.portfolios))throw new Error('Invalid portfolio list response.');
   const rows=result.portfolios.map(p=>PrivatePortfolio.parse(p));
   if(sessionKey.current===expected&&request===listRevision.current)setPortfolios(rows);
  }catch(e){if(sessionKey.current===expected&&request===listRevision.current)setListError('Could not load My Portfolios. '+e.message);}
  finally{if(sessionKey.current===expected&&request===listRevision.current)setListing(false);}
 };
 useEffect(()=>{
  operation.current++;listRevision.current++;busy.current=false;
  setDraft(empty(key,data?.scenario?structuredClone(data.scenario):null));setPortfolios([]);
  setSaving(false);setLoading(false);setListing(false);setSaveError('');setLoadError('');setListError('');
  setDeleting(false);setDeleteError('');
  if(key)void refreshPortfolios();
  return()=>{operation.current++;listRevision.current++;};
 },[key]);
 useEffect(()=>{if(key&&data)setDraft(previous=>previous.key===key&&!previous.scenario?{...previous,scenario:structuredClone(data.scenario)}:previous);},[key,data]);
 const confirmReplace=()=>!current.dirty||window.confirm('Discard unsaved portfolio changes and replace the current draft?');
 const edit=patch=>{
  if(!belongs||busy.current)return;
  setSaveError('');
  setDraft(previous=>previous.key===key?{...previous,...patch,dirty:true,revision:previous.revision+1}:previous);
 };
 const newPortfolio=()=>{
  if(busy.current||!confirmReplace())return false;
  operation.current++;setDraft(empty(key,structuredClone(data.scenario)));setSaveError('');setLoadError('');return true;
 };
 const applySample=(fixture,investment=false)=>{
  const next=empty(key,structuredClone(fixture.scenario));
  const holdings=structuredClone(fixture.holdings).map(h=>({...h,portfolioId:next.id}));
  const name=investment?'Sectivia simulated investment portfolio':fixture.dataset.dataState==='synthetic_operational_demo'?'Imported dataset sample':'Fictional reference sample';
  portfolioWrite({id:next.id,name,holdings,scenario:next.scenario},fixture.dataset);
  setDraft({...next,name,holdings,mode:investment?'private':'sample',dirty:true});
  setSaveError('');setLoadError('');return true;
 };
 const loadSample=()=>{
  if(busy.current||!confirmReplace())return false;
  return applySample(data);
 };
 const loadInvestmentSample=async()=>{
  if(!belongs||busy.current||!confirmReplace())return false;
  const expected=key,request=++operation.current;busy.current=true;setLoading(true);setLoadError('');
  try{
   const fixture=await loadDataset('climateweb'),ids=['a','abbv','cah','cvs'];
   if(fixture.holdings.length!==4||fixture.holdings.reduce((n,h)=>n+h.amount,0)!==10000000||ids.some(id=>!fixture.holdings.some(h=>h.companyId===id&&h.matchingStatus==='matched')||!fixture.dataset.companies.some(c=>c.id===id)))throw new Error('Installed Sectivia investment sample is unavailable.');
   if(ids.slice(1).some((id,i)=>!fixture.dataset.commercialEdges.some(e=>e.supplierCompanyId===ids[i]&&e.customerCompanyId===id)))throw new Error('Installed sample commercial chain is unavailable.');
   if(sessionKey.current!==expected||request!==operation.current)return false;
   const next=empty(key,structuredClone(fixture.scenario));
   portfolioWrite({id:next.id,name:'Sectivia simulated investment portfolio',holdings:fixture.holdings.map(h=>({...h,portfolioId:next.id})),scenario:next.scenario},fixture.dataset);
   activateDataset(fixture);return applySample(fixture,true);
  }catch(e){if(sessionKey.current===expected&&request===operation.current)setLoadError('Sample loading failed. Your draft was retained. '+e.message);return false;}
  finally{if(sessionKey.current===expected&&request===operation.current){busy.current=false;setLoading(false);}}
 };
 const openPortfolio=async id=>{
  if(busy.current||!confirmReplace())return false;
  const expected=key,request=++operation.current;busy.current=true;setLoading(true);setLoadError('');
  try{
   // The current API has an account-scoped list endpoint, not GET /portfolios/:id.
   const result=await cloudRequest('/portfolios');
   if(result.schemaVersion!=='1.0.0'||!Array.isArray(result.portfolios))throw new Error('Invalid portfolio list response.');
   const portfolio=PrivatePortfolio.parse(result.portfolios.find(p=>p.id===id));
   const fixture=await loadDataset(portfolio.dataset_version);
   portfolioWrite({id:portfolio.id,name:portfolio.name,holdings:portfolio.draft.holdings,scenario:portfolio.draft.scenario},fixture.dataset);
   if(sessionKey.current!==expected||request!==operation.current)return false;
   activateDataset(fixture);
   setDraft({key:expected,id:portfolio.id,name:portfolio.name,holdings:structuredClone(portfolio.draft.holdings),scenario:portfolio.draft.scenario,
    mode:'private',dirty:false,lastSavedAt:portfolio.updated_at,revision:0,saved:true});
   setSaveError('');return true;
  }catch(e){if(sessionKey.current===expected&&request===operation.current)setLoadError('Open failed. Your current draft was retained. '+e.message);return false;}
  finally{if(sessionKey.current===expected&&request===operation.current){busy.current=false;setLoading(false);}}
 };
 const savePortfolio=async()=>{
  if(busy.current||!belongs)return false;
  const expected=key,request=++operation.current,snapshot=structuredClone(draftRef.current);
  busy.current=true;setSaving(true);setSaveError('');
  try{
   const body=portfolioWrite(snapshot,data.dataset);
   const result=await cloudRequest('/portfolios',{method:'POST',body:JSON.stringify(body)});
   if(result.schemaVersion!=='1.0.0')throw new Error('Unsupported portfolio response version.');
   const saved=PrivatePortfolio.parse(result.portfolio);
   if(saved.id!==snapshot.id)throw new Error('Saved portfolio ID does not match this draft.');
   portfolioWrite({id:saved.id,name:saved.name,holdings:saved.draft.holdings,scenario:saved.draft.scenario},data.dataset);
   if(sessionKey.current!==expected||request!==operation.current)return false;
   setDraft(previous=>previous.revision===snapshot.revision?{...previous,name:saved.name,holdings:saved.draft.holdings,scenario:saved.draft.scenario,
    mode:'private',saved:true,dirty:false,lastSavedAt:saved.updated_at}: {...previous,saved:true,lastSavedAt:saved.updated_at});
   setPortfolios(previous=>[saved,...previous.filter(p=>p.id!==saved.id)]);return true;
  }catch(e){if(sessionKey.current===expected&&request===operation.current)setSaveError('Save failed. Your unsaved changes were retained. '+e.message);return false;}
  finally{if(sessionKey.current===expected&&request===operation.current){busy.current=false;setSaving(false);}}
 };
 const switchDataset=async id=>{
  if(busy.current||!confirmReplace())return false;
  const expected=key,request=++operation.current;busy.current=true;setLoading(true);setLoadError('');
  try{
   const fixture=await loadDataset(id);
   if(sessionKey.current!==expected||request!==operation.current)return false;
   activateDataset(fixture);setDraft(empty(expected,Scenario.parse(fixture.scenario)));setSaveError('');return true;
  }catch(e){if(sessionKey.current===expected&&request===operation.current)setLoadError('Dataset switch failed. Your draft was retained. '+e.message);return false;}
  finally{if(sessionKey.current===expected&&request===operation.current){busy.current=false;setLoading(false);}}
 };
 const deletePortfolio=async id=>{
  if(!belongs||busy.current||!portfolios.some(p=>p.id===id)||id===current.id&&!confirmReplace())return false;
  const expected=key,request=++operation.current;busy.current=true;setDeleting(true);setDeleteError('');
  listRevision.current++;setListing(false);
  try{
   const result=await cloudRequest('/portfolios/'+encodeURIComponent(id),{method:'DELETE'});
   if(result.schemaVersion!=='1.0.0'||result.deleted!==id)throw new Error('Portfolio deletion was not confirmed by the server.');
   if(sessionKey.current!==expected||request!==operation.current)return false;
   setPortfolios(previous=>previous.filter(p=>p.id!==id));
   setDraft(previous=>previous.id===id?empty(expected,structuredClone(data.scenario)):previous);
   setSaveError('');setLoadError('');return true;
  }catch(e){if(sessionKey.current===expected&&request===operation.current)setDeleteError('Delete failed or was not confirmed. Your current draft was retained. Refresh My Portfolios to check server state. '+e.message);return false;}
  finally{if(sessionKey.current===expected&&request===operation.current){busy.current=false;setDeleting(false);}}
 };
 return {holdings:current.holdings,scenario:current.scenario,activePortfolioId:current.id,activePortfolioName:current.name,
  portfolioMode:current.mode,isDirty:current.dirty,lastSavedAt:current.lastSavedAt,isSaving,isLoadingPortfolio,isListing,
  workspaceLoading:!auth.ready||!!key&&(!belongs||!current.scenario),saveError,loadError,listError,isDeletingPortfolio,deleteError,deletePortfolio,
  privatePortfolios:belongs?portfolios:[],setHoldings:value=>edit({holdings:value}),setScenario:value=>edit({scenario:value}),
  setPortfolioName:name=>edit({name}),createPortfolio:newPortfolio,loadSample,loadInvestmentSample,savePortfolio,openPortfolio,refreshPortfolios,switchDataset};
}
