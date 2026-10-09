import { useState,lazy,Suspense } from 'react';
import { NavLink,Routes,Route,Navigate,useLocation } from 'react-router-dom';
import { useApp } from './state/AppState.jsx';
import { Notice } from './components.jsx';
import Portfolio from './pages/Portfolio.jsx';
import Scenarios from './pages/Scenarios.jsx';
import Compare from './pages/Compare.jsx';
const Graph=lazy(()=>import('./pages/Graph.jsx'));
const Results=lazy(()=>import('./pages/Results.jsx'));
const Locations=lazy(()=>import('./pages/Locations.jsx'));
const Auth=lazy(()=>import('./pages/Auth.jsx'));
import {Welcome,Overview,Evidence,Reports} from './pages/WorkspacePages.jsx';
const links=[['overview','Overview'],['portfolio','Portfolio'],['graph','Exposure graph'],['locations','Locations'],['scenarios','Scenarios'],['compare','Compare'],['evidence','Evidence'],['reports','Reports']];
export default function App(){const app=useApp(),[menu,setMenu]=useState(false),location=useLocation();
  if(!app.data)return <main><h1>MeghDrishti</h1><Notice error={!!app.error}>{app.error||'Loading validated synthetic fixture…'}</Notice></main>;
  return <><a href="#main" className="skip">Skip to content</a><header><NavLink to="/welcome"><strong>MeghDrishti</strong></NavLink><span className="badge">Demo simulation</span><button className="secondary menu-button" aria-expanded={menu} aria-controls="workspace-nav" onClick={()=>setMenu(!menu)}>Menu</button><NavLink to="/auth">Sign in</NavLink></header><div className="shell"><nav id="workspace-nav" className={menu?'open':''} aria-label="Workspace">{links.map(([path,label])=><NavLink key={path} to={`/${path}`} onClick={()=>setMenu(false)}>{label}</NavLink>)}{app.history.list()[0]&&<NavLink to={`/results/${app.history.list()[0].id}`}>Latest results</NavLink>}</nav><main id="main"><p className="breadcrumb">Workspace / {location.pathname.split('/')[1]||'Welcome'}</p><Notice>Synthetic data · Assumed exposure, not a forecast of investment loss.</Notice>{app.history.warning&&<Notice>{app.history.warning}</Notice>}{app.error&&<Notice error>{app.error}</Notice>}{app.validationError&&<Notice error>{app.validationError}</Notice>}
    <Suspense fallback={<Notice>Loading page…</Notice>}><Routes><Route path="/" element={<Navigate to="/welcome" replace/>}/><Route path="/welcome" element={<Welcome/>}/><Route path="/auth" element={<Auth/>}/><Route path="/overview" element={<Overview/>}/><Route path="/portfolio" element={<Portfolio/>}/><Route path="/graph" element={<Graph/>}/><Route path="/locations" element={<Locations/>}/><Route path="/scenarios" element={<Scenarios/>}/><Route path="/results/:runId" element={<Results/>}/><Route path="/compare" element={<Compare/>}/><Route path="/evidence" element={<Evidence/>}/><Route path="/reports" element={<Reports/>}/><Route path="*" element={<><h1>Page not found</h1><NavLink to="/overview">Return to overview</NavLink></>}/></Routes></Suspense><footer>Temporary functional development shell. Stitch layouts can replace this presentation while retaining the contracts and services.</footer></main></div></>;
}
