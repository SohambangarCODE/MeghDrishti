import { createContext,useContext,useEffect,useState } from 'react';
import { supabase } from '../services/live/supabase.js';
const Context=createContext(null);
export function AuthState({children}){
 const [session,setSession]=useState(null),[ready,setReady]=useState(!supabase),[expired,setExpired]=useState(false);
 useEffect(()=>{if(!supabase)return;let active=true;
  supabase.auth.getSession().then(({data,error})=>{if(active){setSession(data?.session||null);setExpired(!!error);setReady(true);}}).catch(()=>{if(active){setExpired(true);setReady(true);}});
  const {data}=supabase.auth.onAuthStateChange((event,value)=>{if(active){setSession(value);setReady(true);if(value)setExpired(false);}});
  const expiry=()=>{setExpired(true);setSession(null);};window.addEventListener('meghdrishti:session-expired',expiry);
  return ()=>{active=false;data.subscription.unsubscribe();window.removeEventListener('meghdrishti:session-expired',expiry);};
 },[]);
 return <Context.Provider value={{session,ready,expired,configured:!!supabase}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
