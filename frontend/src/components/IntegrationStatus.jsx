import { useEffect,useState } from 'react';
import { getIntegrationStatus } from '../services/live/climate.js';
import { Notice } from '../components.jsx';
export function IntegrationStatus(){
 const [result,setResult]=useState(null),[error,setError]=useState(''),[pending,setPending]=useState(false);
 const refresh=async()=>{setPending(true);setError('');try{setResult(await getIntegrationStatus());}catch(e){setError(e.message);}finally{setPending(false);}};
 useEffect(()=>{let active=true;getIntegrationStatus().then(r=>{if(active)setResult(r);}).catch(e=>{if(active)setError(e.message);});return ()=>{active=false;};},[]);
 return <section><h2>Integration status</h2><p>Configuration status is not proof of external connectivity or source coverage.</p>{error&&<Notice error>{error}</Notice>}{result&&<table><thead><tr><th>Service</th><th>Actual status</th></tr></thead><tbody>{Object.entries(result.services).map(([name,status])=><tr key={name}><th>{name}</th><td>{status}</td></tr>)}</tbody></table>}<button className="secondary" disabled={pending} onClick={refresh}>{pending?'Refreshing status...':'Refresh integration status'}</button></section>;
}
