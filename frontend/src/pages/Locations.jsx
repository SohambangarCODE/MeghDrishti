import { useEffect, useRef, useState } from "react";
import L from "leaflet";
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
    [routes, setRoutes] = useState(true);
  const navigate=useNavigate();
  const [routeQuery,setRouteQuery]=useState('');
  const [weatherPoint, setWeatherPoint] = useState(null),
    mapInstance = useRef(null),
    weatherMarker = useRef(null);
  const [params, setParams] = useSearchParams();
  const selected = params.get("entity") || "";
  const select = (id) => setParams({ entity: id });
  const selectedFacility = data.facilities.find(
    (f) => f.id === selected || f.companyId === selected,
  );
  const selectedCompany =
    data.companies.find((c) => c.id === selected)?.id ||
    selectedFacility?.companyId;
  const shownFacilities = data.facilities
    .filter((f) => !selectedCompany || f.companyId === selectedCompany)
    .slice(0, 50);

  const selectedRoute=data.routes.find(r=>r.id===selected);
  const shownRoutes=data.routes.filter(r=>(!selectedCompany||data.routeUsage.some(u=>u.companyId===selectedCompany&&u.routeId===r.id))&&r.name.toLowerCase().includes(routeQuery.toLowerCase()));
  const chooseRoute=id=>{setWeatherPoint(null);select(id);setRoutes(true);};
  const routeEvents=selectedRoute?data.events.filter(e=>e.affectedEntityIds.includes(selectedRoute.id)):[];
  const routeCoordinates=selectedRoute?.geometry?.type==='LineString'?selectedRoute.geometry.coordinates:[];
  useEffect(() => {
    if (!onlineMap || !ref.current) return;
    const map = L.map(ref.current).setView([20, 78], 5);
    mapInstance.current = map;
    map.on("click", (e) =>
      setWeatherPoint({
        latitude: Number(e.latlng.lat.toFixed(5)),
        longitude: Number(e.latlng.lng.toFixed(5)),
      }),
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    })
      .on("tileerror", () => setFailed(true))
      .addTo(map);
    const points = [];
    if (facilities)
      for (const f of data.facilities.filter(
        (f) => !selectedCompany || f.companyId === selectedCompany,
      ))
        if (f.latitude !== null && f.longitude !== null) {
          const point = [f.latitude, f.longitude];
          points.push(point);
          const marker=L.circleMarker(point, {
            bubblingMouseEvents: false,
            radius: 8,
            color:
              selected === f.id || selected === f.companyId
                ? "#944100"
                : "#397d76",
          })
            .addTo(map)
            .on("click", () => select(f.id));
          const tip=document.createElement('span');tip.textContent=f.name+' — '+evidence.facility(f.id).text;marker.bindTooltip(tip);
        }
    const routePoints=[];
    if (routes) for(const r of shownRoutes) if(r.geometry?.type==='LineString'){
      const coordinates=r.geometry.coordinates.map(([lon,lat])=>[lat,lon]);
      const active=r.id===selected;
      routePoints.push(...coordinates);
      const line=L.polyline(coordinates,{color:active?'#b8560d':'#2563eb',weight:active?6:3,opacity:selectedRoute&&!active ? .4 : .85,bubblingMouseEvents:false}).addTo(map);
      const label=document.createElement('span');label.textContent=r.name+' — '+evidence.route(r.id).text;line.bindTooltip(label).on('click',()=>chooseRoute(r.id));
      if(active){
        coordinates.forEach((point,index)=>{
          const marker=L.circleMarker(point,{radius:index===0||index===coordinates.length-1?8:4,color:'#b8560d',fillColor:'white',fillOpacity:1,bubblingMouseEvents:false}).addTo(map);
          const tip=document.createElement('span');tip.textContent=index===0?'Start (geometry order)':index===coordinates.length-1?'End (geometry order)':`Waypoint ${index}`;marker.bindTooltip(tip);
        });
      }
    }
    const boundsPoints=selectedRoute?.geometry?.type==='LineString'?selectedRoute.geometry.coordinates.map(([lon,lat])=>[lat,lon]):[...points,...routePoints];
    if(boundsPoints.length)map.fitBounds(L.latLngBounds(boundsPoints),{maxZoom:7,padding:[40,40]});
    return () => {
      map.remove();
      mapInstance.current = null;
      weatherMarker.current = null;
    };
  }, [onlineMap, facilities, routes, data, selected, selectedCompany, routeQuery]);
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !weatherPoint) return;
    if (weatherMarker.current) map.removeLayer(weatherMarker.current);
    weatherMarker.current = L.circleMarker(
      [weatherPoint.latitude, weatherPoint.longitude],
      {
        radius: 11,
        color: "#2563eb",
        fillOpacity: 0.7,
        bubblingMouseEvents: false,
      },
    )
      .addTo(map)
      .bindTooltip("Selected weather point - not a verified company site");
    map.panTo([weatherPoint.latitude, weatherPoint.longitude]);
  }, [
    weatherPoint,
    onlineMap,
    facilities,
    routes,
    data,
    selected,
    selectedCompany,
    routeQuery,
  ]);
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
        <button className="secondary" onClick={() => setOnlineMap(!onlineMap)}>
          {onlineMap ? "Use offline list" : "Load online map tiles"}
        </button>
      </div>
      <section><h2>Transport corridor explorer</h2><p>Blue lines show supplied geometry; its evidence quality is labelled per corridor. Orange highlights your selection; endpoint markers describe geometry order, not verified shipment direction. No road routing or travel time is inferred.</p><div className="fields"><label>Find corridor<input value={routeQuery} onChange={e=>setRouteQuery(e.target.value)} placeholder="Search route name"/></label><label>Transport corridor<select value={shownRoutes.some(r=>r.id===selected)?selected:''} onChange={e=>chooseRoute(e.target.value)}><option value="">Choose a corridor</option>{shownRoutes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div><div className="actions"><button className="secondary" onClick={()=>{setWeatherPoint(null);select('');setRouteQuery('');}}>Reset map selection</button><span>{shownRoutes.length} corridors match the current company/search.</span></div>
      {selectedRoute&&<article className="location-card selected"><h3>{selectedRoute.name}</h3><p>Transport mode: {selectedRoute.mode||'Unknown'} · Source: {selectedRoute.provenance}. <span title={evidence.route(selectedRoute.id).detail}>{evidence.route(selectedRoute.id).text}</span>. Geometry: {routeCoordinates.length?`${routeCoordinates.length} supplied points`:'not supplied'}.</p>{routeCoordinates.length>0&&<p>Start: {routeCoordinates[0][1]}, {routeCoordinates[0][0]} → End: {routeCoordinates.at(-1)[1]}, {routeCoordinates.at(-1)[0]}</p>}<div className="actions"><Link className="button secondary" to={`/graph?entity=${encodeURIComponent(selectedRoute.id)}`}>Inspect selected route in graph</Link>{routeCoordinates.length>0&&<><button className="secondary" onClick={()=>setWeatherPoint({latitude:routeCoordinates[0][1],longitude:routeCoordinates[0][0]})}>Weather at route start</button><button className="secondary" onClick={()=>setWeatherPoint({latitude:routeCoordinates.at(-1)[1],longitude:routeCoordinates.at(-1)[0]})}>Weather at route end</button></>}{!privateRun&&routeEvents.map(event=><button key={event.id} onClick={()=>{app.setScenario({...app.scenario,id:event.id,eventIds:[event.id],eventOverrides:{},assumptionOverrides:[]});navigate('/scenarios');}}>Configure route disruption</button>)}</div>{!routeEvents.length&&<p>No supplied disruption scenario targets this corridor. Select a supported scenario on the Scenarios page.</p>}<details><summary>Companies using this corridor ({data.routeUsage.filter(u=>u.routeId===selectedRoute.id).length})</summary><div className="table-scroll"><table><thead><tr><th>Company</th><th>Assumed shipment share</th><th>Assumed substitutability</th></tr></thead><tbody>{data.routeUsage.filter(u=>u.routeId===selectedRoute.id).map(u=><tr key={u.id}><th><button className="secondary" onClick={()=>select(u.companyId)}>{data.companies.find(c=>c.id===u.companyId)?.name||u.companyId}</button></th><td>{u.shipmentShare===null?'Unknown':`${u.shipmentShare*100}%`}</td><td>{u.substitutability===null?'Unknown':`${u.substitutability*100}%`}</td></tr>)}</tbody></table></div></details></article>}</section>
      {onlineMap && (
        <div ref={ref} className="map" aria-label="Illustrative facility map" />
      )}
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
            Showing up to 50 sites. Select a company to inspect its footprint.
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
