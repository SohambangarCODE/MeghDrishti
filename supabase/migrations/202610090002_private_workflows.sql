-- Additive private workflow support. Apply after 202610090001_initial.sql.
begin;
create table if not exists public.app_migrations(version text primary key, applied_at timestamptz not null default now());
revoke all on public.app_migrations from anon,authenticated;
insert into public.app_migrations(version) values('202610090001_initial') on conflict do nothing;
alter table public.portfolios add column if not exists dataset_version text;
alter table public.portfolios add column if not exists draft jsonb not null default '{}'::jsonb;
alter table public.portfolios add column if not exists updated_at timestamptz not null default now();
-- Source IDs belong to an immutable backend dataset version. Do not require an
-- administrator to duplicate that public dataset in Postgres to save private drafts.
alter table public.holdings drop constraint if exists holdings_company_id_fkey;
alter table public.analysis_results drop constraint analysis_results_run_id_fkey;
alter table public.analysis_results add constraint analysis_results_run_id_fkey foreign key(run_id) references public.analysis_runs(id) on delete cascade;
grant delete on public.analysis_runs to authenticated;
create policy run_owner_delete on public.analysis_runs for delete to authenticated using(owner_id=(select auth.uid()));

create or replace function public.save_portfolio(p_id uuid,p_name text,p_dataset_version text,p_holdings jsonb,p_scenario jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner uuid:=auth.uid(); row_data public.portfolios; h jsonb; o jsonb;
begin
 if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if jsonb_typeof(p_holdings)<>'array' or jsonb_array_length(p_holdings)>1000 or length(p_name)<1 or length(p_name)>200 then raise exception 'Invalid portfolio'; end if;
 select * into row_data from public.portfolios where id=p_id for update;
 if found then
  update public.portfolios set name=p_name,dataset_version=p_dataset_version,draft=jsonb_build_object('holdings',p_holdings,'scenario',p_scenario),updated_at=now()
   where id=p_id and owner_id=owner returning * into row_data;
 else
  insert into public.portfolios(id,owner_id,name,dataset_version,draft) values(p_id,owner,p_name,p_dataset_version,jsonb_build_object('holdings',p_holdings,'scenario',p_scenario)) returning * into row_data;
 end if;
 delete from public.holdings where portfolio_id=p_id;
 for h in select value from jsonb_array_elements(p_holdings) loop
  insert into public.holdings(portfolio_id,company_id,original_input_name,amount,currency,matching_status,exclusion_reason)
  values(p_id,h->>'companyId',h->>'originalInputName',(h->>'amount')::numeric,h->>'currency',h->>'matchingStatus',h->>'exclusionReason');
 end loop;
 delete from public.assumption_overlays where portfolio_id=p_id;
 for o in select value from jsonb_array_elements(coalesce(p_scenario->'assumptionOverrides','[]'::jsonb)) loop
  insert into public.assumption_overlays(portfolio_id,owner_id,payload) values(p_id,owner,o);
 end loop;
 return to_jsonb(row_data);
end $$;

create or replace function public.save_analysis(p_portfolio_id uuid,p_snapshot jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner uuid:=auth.uid(); existing public.analysis_runs; clean jsonb;
begin
 if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not exists(select 1 from public.portfolios where id=p_portfolio_id and owner_id=owner) then raise exception 'Portfolio unavailable' using errcode='42501'; end if;
 if coalesce(p_snapshot->>'requestId','')='' or length(p_snapshot->>'inputHash')<>64 then raise exception 'Invalid snapshot identity'; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text || ':' || (p_snapshot->>'requestId'),0));
 select * into existing from public.analysis_runs where owner_id=owner and request_id=p_snapshot->>'requestId';
 if found then
  if existing.input_hash<>p_snapshot->>'inputHash' or existing.portfolio_id<>p_portfolio_id then raise exception 'Idempotency conflict' using errcode='23505'; end if;
  return existing.snapshot;
 end if;
 clean=p_snapshot || jsonb_build_object('ownerId',owner,'portfolioId',p_portfolio_id,'storage','private Supabase snapshot');
 insert into public.analysis_runs(id,portfolio_id,owner_id,request_id,input_hash,snapshot)
 values((clean->>'id')::uuid,p_portfolio_id,owner,clean->>'requestId',clean->>'inputHash',clean);
 insert into public.analysis_results(run_id,payload) values((clean->>'id')::uuid,jsonb_build_object('totals',clean->'totals','holdingsResults',clean->'holdingsResults'));
 return clean;
end $$;
create or replace function public.delete_portfolio(p_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform 1 from public.portfolios where id=p_id and owner_id=auth.uid() for update;
 if not found then return false; end if;
 delete from public.analysis_runs where portfolio_id=p_id;
 delete from public.assumption_overlays where portfolio_id=p_id;
 delete from public.portfolios where id=p_id;
 return true;
end $$;
revoke all on function public.delete_portfolio(uuid) from public,anon;
grant execute on function public.delete_portfolio(uuid) to authenticated;
revoke all on function public.save_portfolio(uuid,text,text,jsonb,jsonb) from public,anon;
revoke all on function public.save_analysis(uuid,jsonb) from public,anon;
grant execute on function public.save_portfolio(uuid,text,text,jsonb,jsonb) to authenticated;
grant execute on function public.save_analysis(uuid,jsonb) to authenticated;
insert into public.app_migrations(version) values('202610090002_private_workflows') on conflict do nothing;
commit;
