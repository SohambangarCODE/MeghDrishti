import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {modeledEvents,hazardTargets} from "../services/hazards.js";
import {facilitiesForView,geometryStyle,viewportKey,hasCoordinates,hasGeometry} from "../services/mapView.js";
import { PointWeather } from "../components/PointWeather.jsx";
import { WeatherPanel } from "../components/ClimatePanels.jsx";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useApp } from "../state/AppState.jsx";
import { Notice } from "../components.jsx";
export default function Locations() {
 const app=useApp(),privateRun=app.activeCloudRun,dataset=privateRun?privateRun.sourceSnapshot:app.data.dataset;
 const evidence=privateRun?app.activeRunEvidence:app.editingEvidence;
 if(!evidence?.available)return <><h1>Operational locations</h1><Notice>Source snapshot unavailable. Historical locations cannot use the selected installed dataset.</Notice></>;
 return <LocationsView key={privateRun?.id||app.datasetId} data={dataset} evidence={evidence} privateRun={privateRun}/>;
}
function LocationsView({data,evidence,privateRun}) {
  const app = useApp(),
    ref = useRef(null),
    [onlineMap, setOnlineMap] = useState(false),
    [failed, setFailed] = useState(false),
    [facilities, setFacilities] = useState(true),
    [routes, setRoutes] = useState(true),
    [hazards,setHazards]=useState(false),
    [hazardEventId,setHazardEventId]=useState(null);
  const navigate=useNavigate();
  const [routeQuery,setRouteQuery]=useState('');
  const [weatherPoint, setWeatherPoint] = useState(null),
    mapInstance = useRef(null),
    facilityLayers = useRef(null),
    routeLayers = useRef(null),
    weatherLayers = useRef(null),
    hazardLayers = useRef(null),
    lastViewport = useRef(null),
    actions = useRef(null);
  const [params, setParams] = useSearchParams();
  const selected = params.get("entity") || "";
  const select = (id) => setParams({ entity: id });
  const selectedFacility = data.facilities.find(
    (f) => f.id === selected || f.companyId === selected,
  );
  const selectedCompany =
    data.companies.find((c) => c.id === selected)?.id ||
    selectedFacility?.companyId;
  const shownFacilities = facilitiesForView(data,selectedCompany);

  const selectedRoute=data.routes.find(r=>r.id===selected);
  const shownRoutes=data.routes.filter(r=>(!selectedCompany||data.routeUsage.some(u=>u.companyId===selectedCompany&&u.routeId===r.id))&&r.name.toLowerCase().includes(routeQuery.toLowerCase()));
  const chooseRoute=id=>{setWeatherPoint(null);select(id);setRoutes(true);};
  const routeEvents=selectedRoute?data.events.filter(e=>e.affectedEntityIds.includes(selectedRoute.id)):[];
  const routeCoordinates=hasGeometry(selectedRoute)?selectedRoute.geometry.coordinates:[];
  const events=modeledEvents(data,app.scenario,privateRun);
  const activeHazardId=events.some(e=>e.id===hazardEventId)?hazardEventId:events[0]?.id;
  const hazardView=hazardTargets(data,events,activeHazardId);
  actions.current={select,chooseRoute};
  // Enable tiles lazily; retain this instance across selection and offline toggles.
  useEffect(()=>{
    if(!onlineMap||!ref.current)return;
    if(!mapInstance.current){
      const map=L.map(ref.current).setView([20,78],5);
      mapInstance.current=map;
      facilityLayers.current=L.layerGroup().addTo(map);
      routeLayers.current=L.layerGroup().addTo(map);
      weatherLayers.current=L.layerGroup().addTo(map);
      map.createPane('hazardTargets').style.zIndex='350';
      hazardLayers.current=L.layerGroup().addTo(map);
      map.on('click',e=>setWeatherPoint({latitude:Number(e.latlng.lat.toFixed(5)),longitude:Number(e.latlng.lng.toFixed(5))}));
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'})
        .on('tileerror',()=>setFailed(true)).addTo(map);
    }
    mapInstance.current.invalidateSize();
  },[onlineMap]);
  useEffect(()=>()=>{
    mapInstance.current?.remove();
    mapInstance.current=null;
    facilityLayers.current=null;routeLayers.current=null;weatherLayers.current=null;hazardLayers.current=null;
    lastViewport.current=null;
  },[]);
  useEffect(()=>{
    const map=mapInstance.current;
    if(!map||!onlineMap)return;
    facilityLayers.current.clearLayers();routeLayers.current.clearLayers();
    const points=[],routePoints=[];
    if(facilities)for(const f of shownFacilities)if(hasCoordinates(f)){
      const point=[f.latitude,f.longitude];points.push(point);
      const style=geometryStyle(f,'facility',data);
      const marker=L.circleMarker(point,{...style,radius:8,bubblingMouseEvents:false,
        color:selected===f.id||selected===f.companyId?'#944100':style.status==='unknown'?'#77717b':'#397d76'})
        .addTo(facilityLayers.current).on('click',()=>actions.current.select(f.id));
      const tip=document.createElement('span');tip.textContent=f.name+' — '+evidence.facility(f.id).text;marker.bindTooltip(tip);
    }
    if(routes)for(const r of shownRoutes)if(hasGeometry(r)){
      const coordinates=r.geometry.coordinates.map(([lon,lat])=>[lat,lon]),active=r.id===selected;
      routePoints.push(...coordinates);
      const style=geometryStyle(r,'route',data);
      const line=L.polyline(coordinates,{...style,color:active?'#b8560d':style.status==='unknown'?'#77717b':'#2563eb',weight:active?6:3,
        opacity:selectedRoute&&!active?Math.min(style.opacity,.4):style.opacity,bubblingMouseEvents:false}).addTo(routeLayers.current);
      const label=document.createElement('span');label.textContent=r.name+' — '+evidence.route(r.id).text;
      line.bindTooltip(label).on('click',()=>actions.current.chooseRoute(r.id));
      if(active)coordinates.forEach((point,index)=>{
        const marker=L.circleMarker(point,{radius:index===0||index===coordinates.length-1?8:4,color:'#b8560d',fillColor:'white',fillOpacity:1,bubblingMouseEvents:false}).addTo(routeLayers.current);
        const tip=document.createElement('span');tip.textContent=index===0?'Start (geometry order)':index===coordinates.length-1?'End (geometry order)':`Waypoint ${index}`;marker.bindTooltip(tip);
      });
    }
    const exactFacility=data.facilities.find(f=>f.id===selected&&hasCoordinates(f));
    const boundsPoints=routes&&hasGeometry(selectedRoute)?routeCoordinates.map(([lon,lat])=>[lat,lon]):facilities&&exactFacility?[[exactFacility.latitude,exactFacility.longitude]]:[...points,...routePoints];
    const signature=viewportKey(boundsPoints,selected);
    if(signature!==lastViewport.current){
      lastViewport.current=signature;
      if(boundsPoints.length===1)map.setView(boundsPoints[0],7);
      else if(boundsPoints.length)map.fitBounds(L.latLngBounds(boundsPoints),{maxZoom:7,padding:[40,40]});
    }
  },[onlineMap,facilities,routes,data,selected,selectedCompany,routeQuery,evidence]);
  useEffect(()=>{
    const map=mapInstance.current;
    if(!map||!onlineMap)return;
    weatherLayers.current.clearLayers();
    if(!weatherPoint)return;
    L.circleMarker([weatherPoint.latitude,weatherPoint.longitude],{radius:11,color:'#2563eb',fillOpacity:.7,bubblingMouseEvents:false})
      .addTo(weatherLayers.current).bindTooltip('Selected weather point - not a verified company site');
    map.panTo([weatherPoint.latitude,weatherPoint.longitude]);
  },[weatherPoint,onlineMap]);
  const hazardKey=JSON.stringify(hazardView);
  useEffect(()=>{
    if(!mapInstance.current||!onlineMap)return;
    hazardLayers.current.clearLayers();
    if(!hazards)return;
    for(const target of hazardView.targets){
      if(target.type==='unavailable')continue;
      const tip=document.createElement('span');tip.textContent=target.text;
      if(target.type==='boundary')L.geoJSON(target.geometry,{pane:'hazardTargets',style:{className:'hazard-target-region',color:'#8054a1',weight:2,dashArray:'4 4',fillOpacity:.12,bubblingMouseEvents:false}}).bindTooltip(tip).addTo(hazardLayers.current);
      else {
        const glyph=document.createElement('span');glyph.textContent='+';glyph.title='Modeled target-region centroid';
        L.marker([target.geometry.coordinates[1],target.geometry.coordinates[0]],{pane:'hazardTargets',bubblingMouseEvents:false,icon:L.divIcon({className:'hazard-target-centroid',html:glyph,iconSize:[16,16]})}).bindTooltip(tip).addTo(hazardLayers.current);
      }
    }
  },[onlineMap,hazards,hazardKey]);
  return (
    <>
      <h1>Operational locations</h1>
      <Notice>
        A map pin does not verify an operating facility; a corridor does not
        establish observed shipments. No headquarters or registration-country substitutions are used.
      </Notice>
      {privateRun&&<Notice>Private report locations: immutable source snapshot, in memory only. <button onClick={()=>app.setActiveCloudRun(null)}>Return workspace to demo</button></Notice>}
      <div className="actions">
        <label className="check">
          <input
            type="checkbox"
            checked={facilities}
            onChange={(e) => setFacilities(e.target.checked)}
          />
          Facilities
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={routes}
            onChange={(e) => setRoutes(e.target.checked)}
          />
          Routes
        </label>
        <label className="check"><input type="checkbox" checked={hazards} onChange={e=>setHazards(e.target.checked)}/>Hazards</label>
        <button className="secondary" onClick={() => setOnlineMap(!onlineMap)}>
          {onlineMap ? "Use offline list" : "Load online map tiles"}
        </button>
      </div>
      {hazards&&<section aria-label="Modeled hazard targets"><label>Modeled climate event<select value={activeHazardId||''} onChange={e=>setHazardEventId(e.target.value)}><option value="">Choose a modeled event</option>{events.map(e=><option key={e.id} value={e.id}>{e.id} — {e.hazardType}</option>)}</select></label>
        <p>Dashed shaded regions: modeled target regions, not sourced or observed hazard footprints. Plus markers: target-region centroids only, with no geographic radius. Supplied synthetic, assumed, reported, sourced or unknown geography retains its source classification.</p>
        {hazardView.notice&&<Notice>{hazardView.notice}</Notice>}
        {hazardView.targets.map(target=><div key={target.id}>{target.type==='unavailable'?<Notice>{target.text}</Notice>:<p>{target.text}</p>}</div>)}
        {!onlineMap&&<p>Load online map tiles to display available target geometry; the descriptions above remain usable offline.</p>}
      </section>}
      <section><h2>Transport corridor explorer</h2><p>Blue lines show supplied geometry; its evidence quality is labelled per corridor. Orange highlights your selection; endpoint markers describe geometry order, not verified shipment direction. No road routing or travel time is inferred.</p><div className="fields"><label>Find corridor<input value={routeQuery} onChange={e=>setRouteQuery(e.target.value)} placeholder="Search route name"/></label><label>Transport corridor<select value={shownRoutes.some(r=>r.id===selected)?selected:''} onChange={e=>chooseRoute(e.target.value)}><option value="">Choose a corridor</option>{shownRoutes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div><div className="actions"><button className="secondary" onClick={()=>{setWeatherPoint(null);select('');setRouteQuery('');}}>Reset map selection</button><span>{shownRoutes.length} corridors match the current company/search.</span></div>
      {selectedRoute&&<article className="location-card selected"><h3>{selectedRoute.name}</h3><p>Transport mode: {selectedRoute.mode||'Unknown'} · Source: {selectedRoute.provenance}. <span title={evidence.route(selectedRoute.id).detail}>{evidence.route(selectedRoute.id).text}</span>. Geometry: {routeCoordinates.length?`${routeCoordinates.length} supplied points`:'not supplied'}.</p>{routeCoordinates.length>0&&<p>Start: {routeCoordinates[0][1]}, {routeCoordinates[0][0]} → End: {routeCoordinates.at(-1)[1]}, {routeCoordinates.at(-1)[0]}</p>}<div className="actions"><Link className="button secondary" to={`/graph?entity=${encodeURIComponent(selectedRoute.id)}`}>Inspect selected route in graph</Link>{routeCoordinates.length>0&&<><button className="secondary" onClick={()=>setWeatherPoint({latitude:routeCoordinates[0][1],longitude:routeCoordinates[0][0]})}>Weather at route start</button><button className="secondary" onClick={()=>setWeatherPoint({latitude:routeCoordinates.at(-1)[1],longitude:routeCoordinates.at(-1)[0]})}>Weather at route end</button></>}{!privateRun&&routeEvents.map(event=><button key={event.id} onClick={()=>{app.setScenario({...app.scenario,id:event.id,eventIds:[event.id],eventOverrides:{},assumptionOverrides:[]});navigate('/scenarios');}}>Configure route disruption</button>)}</div>{!routeEvents.length&&<p>No supplied disruption scenario targets this corridor. Select a supported scenario on the Scenarios page.</p>}<details><summary>Companies using this corridor ({data.routeUsage.filter(u=>u.routeId===selectedRoute.id).length})</summary><div className="table-scroll"><table><thead><tr><th>Company</th><th>Assumed shipment share</th><th>Assumed substitutability</th></tr></thead><tbody>{data.routeUsage.filter(u=>u.routeId===selectedRoute.id).map(u=><tr key={u.id}><th><button className="secondary" onClick={()=>select(u.companyId)}>{data.companies.find(c=>c.id===u.companyId)?.name||u.companyId}</button></th><td>{u.shipmentShare===null?'Unknown':`${u.shipmentShare*100}%`}</td><td>{u.substitutability===null?'Unknown':`${u.substitutability*100}%`}</td></tr>)}</tbody></table></div></details></article>}</section>
      <div ref={ref} className="map" hidden={!onlineMap} aria-label="Illustrative facility map" />
      <section aria-label="Map evidence legend"><h2>Map evidence legend</h2><p>Dashed lines and hollow markers: synthetic / assumed geometry. Solid lines and filled markers: claim-specific sourced geometry. Dotted lines and neutral partly filled markers: unknown evidence. Selection highlighting does not change evidence quality; sourced does not mean independently verified.</p></section>
      {failed && (
        <Notice>
          Map tiles unavailable. The location list below remains usable.
        </Notice>
      )}
      <PointWeather point={weatherPoint} onPoint={setWeatherPoint} />
      <div className="split">
        <section>
          <h2>Location list and offline fallback</h2>
          <p>
            {selectedCompany?`Showing all ${shownFacilities.length} recorded sites for this company.`:`Showing ${shownFacilities.length} of ${data.facilities.length} recorded sites (global limit 50). Select a company to show all its sites.`}
          </p>
          <label>
            Company selection
            <select
              value={
                data.companies.some((c) => c.id === selected)
                  ? selected
                  : selectedFacility?.companyId || ""
              }
              onChange={(e) => select(e.target.value)}
            >
              <option value="">Choose a company</option>
              {data.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {facilities &&
            shownFacilities.map((f) => (
              <article
                className={`location-card ${selectedFacility?.id === f.id ? "selected" : ""}`}
                key={f.id}
              >
                <h3>{f.name}</h3>
                <button className="secondary" onClick={() => select(f.id)}>
                  Select facility
                </button>
                <p>
                  {f.latitude === null
                    ? "Coordinates unknown"
                    : `${f.latitude}, ${f.longitude} — ${f.locationPrecision}`}
                </p>
                <p>
                  Operator:{" "}
                  {data.companies.find((c) => c.id === f.companyId)?.name}.
                  <span title={evidence.facility(f.id).detail}>{evidence.facility(f.id).text}</span>.
                </p>
                <Link to={`/graph?entity=${encodeURIComponent(f.id)}`}>
                  Inspect linked graph entity {f.id}
                </Link>
              </article>
            ))}
          {routes &&
            shownRoutes.map((r) => (
              <article key={r.id}>
                <h3>{r.name}</h3><button className="secondary" onClick={()=>chooseRoute(r.id)}>Select corridor</button>
                <Link to={`/graph?entity=${encodeURIComponent(r.id)}`}>
                  Inspect corridor in graph
                </Link>
                <p>
                  <span title={evidence.route(r.id).detail}>{evidence.route(r.id).text}</span>.{" "}
                  {data.routeUsage.filter((u) => u.routeId === r.id).length}{" "}
                  recorded demo company usage(s).
                </p>
              </article>
            ))}
        </section>
        <section className="inspector">
          <h2>Selected operational entity</h2>
          {selected ? (
            <>
              <p className="mono">{selected}</p>
              <Link to={`/graph?entity=${encodeURIComponent(selected)}`}>
                Inspect selection in graph
              </Link>
              {!selectedFacility &&
                data.companies.some((c) => c.id === selected) && (
                  <Notice>
                    No recorded facility for this company. Operating exposure
                    remains unknown.
                  </Notice>
                )}
            </>
          ) : (
            <p>Select a company, a facility record or a map marker.</p>
          )}
          {privateRun?<Notice>Weather evidence unavailable for historical snapshots. No current-dataset weather is substituted or private facility IDs sent for refresh.</Notice>:<WeatherPanel facilityIds={shownFacilities.map((f) => f.id)} />}
        </section>
      </div>
    </>
  );
}
