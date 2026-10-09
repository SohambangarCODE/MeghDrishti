import { createContext,useContext,useEffect,useRef,useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase,invalidatePrivateRequests } from '../services/live/supabase.js';
const Context=createContext(null);
export function AuthState({children}){
 const [session,setSession]=useState(null),[ready,setReady]=useState(!supabase),[expired,setExpired]=useState(false),[generation,setGeneration]=useState(0),[authError,setAuthError]=useState(''),[signingOut,setSigningOut]=useState(false);
 const owner=useRef(null),blocked=useRef(false),queryClient=useQueryClient();
 const clear=()=>{invalidatePrivateRequests();owner.current=null;setSession(null);setGeneration(n=>n+1);queryClient.cancelQueries({predicate:q=>q.queryKey[0]==='private'});queryClient.removeQueries({predicate:q=>q.queryKey[0]==='private'});};
 const signOut=async()=>{blocked.current=true;clear();setSigningOut(true);setAuthError('');try{const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error;}catch{setAuthError('Session cleanup failed. Retry Sign out before signing in again.');}finally{setSigningOut(false);}};
 useEffect(()=>{if(!supabase)return;let active=true,revision=0;
 const accept=(value)=>{if(owner.current!==value?.user.id){clear();owner.current=value?.user.id;}setSession(value);setReady(true);if(value){setExpired(false);setAuthError('');}};
 supabase.auth.getSession().then(({data,error})=>{if(active&&revision===0&&!blocked.current){accept(data?.session||null);if(error)setAuthError('Session restoration failed. Sign in again.');}}).catch(()=>{if(active){setReady(true);setAuthError('Session restoration failed. Sign in again.');}});
 const {data}=supabase.auth.onAuthStateChange((event,value)=>{revision++;if(!active)return;if(event==='SIGNED_IN')blocked.current=false;if(blocked.current&&value)return;accept(value);});
 const expiry=()=>{setExpired(true);void signOut();};window.addEventListener('meghdrishti:session-expired',expiry);
 return ()=>{active=false;data.subscription.unsubscribe();window.removeEventListener('meghdrishti:session-expired',expiry);};
 },[]);
 return <Context.Provider value={{session,ready,expired,generation,signOut,signingOut,authError,configured:!!supabase}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
