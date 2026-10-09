import { createClient } from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY;
// Supabase owns auth-token storage/refresh. Private portfolio data is never cached here.
export const supabase=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}}):null;
let privateGeneration=0;
export function invalidatePrivateRequests(){privateGeneration++;}
export async function cloudRequest(path,options={}){
  const generation=privateGeneration;
  if(!supabase)throw new Error('Supabase not configured');
  const {data,error}=await supabase.auth.getSession();
  if(error||!data.session)throw new Error('Sign in to access private records');
  if(generation!==privateGeneration)throw new Error('Private session changed');
  const base=import.meta.env.VITE_API_BASE_URL;
  if(!base)throw new Error('Private persistence requires the FastAPI backend');
  const response=await fetch(`${base}/api/v1/private${path}`,{...options,signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`,...options.headers}});
  const body=await response.json();
  if(generation!==privateGeneration)throw new Error('Private session changed');
  if(!response.ok){if(response.status===401)window.dispatchEvent(new Event('meghdrishti:session-expired'));throw new Error(body.error?.message||'Private operation failed');}
  return body;
}
