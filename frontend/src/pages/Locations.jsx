import { useEffect,useRef,useState } from 'react';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppState.jsx';
import { Notice } from '../components.jsx';
export default function Locations() {
  const app=useApp(),ref=useRef(null),[onlineMap,setOnlineMap]=useState(false),[failed,setFailed]=useState(false),[facilities,setFacilities]=useState(true),[routes,setRoutes]=useState(true);
  const data=app.data.dataset;
  useEffect(()=>{
    if(!onlineMap||!ref.current)return;
    const map=L.map(ref.current).setView([20,78],5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).on('tileerror',()=>setFailed(true)).addTo(map);
    const points=[];
    if(facilities)for(const f of data.facilities)if(f.latitude!==null&&f.longitude!==null){const point=[f.latitude,f.longitude];points.push(point);L.circleMarker(point,{radius:8,color:'#397d76'}).addTo(map).bindTooltip(`${f.name} — illustrative coordinates`);}
    if(points.length)map.fitBounds(L.latLngBounds(points),{maxZoom:6,padding:[30,30]});
    return ()=>map.remove();
  },[onlineMap,facilities,data]);
  return <><h1>Operational locations</h1><Notice>All locations are synthetic and illustrative. No headquarters or registered-country substitutions are used.</Notice><div className="actions"><label className="check"><input type="checkbox" checked={facilities} onChange={e=>setFacilities(e.target.checked)}/>Facilities</label><label className="check"><input type="checkbox" checked={routes} onChange={e=>setRoutes(e.target.checked)}/>Routes</label><button className="secondary" onClick={()=>setOnlineMap(!onlineMap)}>{onlineMap?'Use offline list':'Load online map tiles'}</button></div>
    {onlineMap&&<div ref={ref} className="map" aria-label="Illustrative facility map"/>}{failed&&<Notice>Map tiles unavailable. The location list below remains usable.</Notice>}
    <section><h2>Location list and offline fallback</h2>{facilities&&data.facilities.map(f=><article key={f.id}><h3>{f.name}</h3><p>{f.latitude===null?'Coordinates unknown':`${f.latitude}, ${f.longitude} — ${f.locationPrecision}`}</p><p>Operator: {data.companies.find(c=>c.id===f.companyId)?.name}. Source: synthetic reference fixture.</p><Link to={`/graph?entity=${encodeURIComponent(f.id)}`}>Inspect linked graph entity {f.id}</Link></article>)}{routes&&data.routes.map(r=><article key={r.id}><h3>{r.name}</h3><p>Route geometry not supplied; shown as a record only. Documented demo usage: Delta Components, shipment share 0.4, replacement fraction 0.</p></article>)}</section>
    <section><h2>Weather evidence</h2><p>Open-Meteo: not connected. Valid time, fetch time, forecast model and readings are unavailable. No synthetic reading is labelled live.</p><p>Heat uses daily maximum temperature (°C). Precipitation (mm) and maximum gusts (km/h) are context only.</p></section>
  </>;
}
