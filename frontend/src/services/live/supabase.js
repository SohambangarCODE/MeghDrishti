import { createClient } from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_ANON_KEY;
// Session stays in memory by default; no private portfolio cache on shared browsers.
export const supabase=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export const privateRepository={
  async listPortfolios(){if(!supabase)throw new Error('Supabase not configured');const {data,error}=await supabase.from('portfolios').select('id,name,currency');if(error)throw error;return data;},
  async createPortfolio(name){if(!supabase)throw new Error('Supabase not configured');const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error('Sign in to save private portfolios');const {data,error}=await supabase.from('portfolios').insert({name,currency:'INR',owner_id:user.id}).select().single();if(error)throw error;return data;},
  async listRuns(){if(!supabase)throw new Error('Supabase not configured');const {data,error}=await supabase.from('analysis_runs').select('id,created_at,snapshot').order('created_at',{ascending:false}).limit(20);if(error)throw error;return data;},
};
