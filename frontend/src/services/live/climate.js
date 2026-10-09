const base=import.meta.env.VITE_API_BASE_URL;
async function request(path,options={}){
  if(!base)throw new Error('Climate evidence requires the FastAPI backend.');
  const response=await fetch(`${base}/api/v1${path}`,{...options,signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json'}});
  const body=await response.json();
  if(!response.ok)throw new Error(body.error?.message||'Climate evidence request failed');
  return body;
}
export const screenWeather=(datasetId,facilityIds)=>request('/weather/screen',{method:'POST',body:JSON.stringify({datasetId,facilityIds})});
export const queryProjections=params=>request('/projections?'+new URLSearchParams(params));
export const getIntegrationStatus=()=>request('/datasets');

export const pointForecast=point=>request('/weather/point',{method:'POST',body:JSON.stringify(point)});
