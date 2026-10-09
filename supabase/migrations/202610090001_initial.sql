-- Apply to a Supabase project using its SQL editor or CLI. No credentials embedded.
begin;
create table public.dataset_versions (
  id text primary key, provenance text not null, manifest jsonb not null,
  created_at timestamptz not null default now()
);
-- Operational records keep normalized identities and immutable source payloads.
create table public.companies (id text primary key, dataset_version text not null references public.dataset_versions(id), name text not null, payload jsonb not null);
create table public.regions (id text primary key, dataset_version text not null references public.dataset_versions(id), payload jsonb not null);
create table public.facilities (id text primary key, company_id text not null references public.companies(id), region_id text references public.regions(id), dataset_version text not null references public.dataset_versions(id), payload jsonb not null);
create table public.routes (id text primary key, dataset_version text not null references public.dataset_versions(id), payload jsonb not null);
create table public.route_waypoints (id text primary key, route_id text not null references public.routes(id), region_id text references public.regions(id), payload jsonb not null);
create table public.commodities (id text primary key, dataset_version text not null references public.dataset_versions(id), payload jsonb not null);
create table public.supply_items (id text primary key, supplier_id text not null references public.companies(id), customer_id text not null references public.companies(id), commodity_id text references public.commodities(id), payload jsonb not null);
create table public.relationships (id text primary key, supplier_id text not null references public.companies(id), customer_id text not null references public.companies(id), dataset_version text not null references public.dataset_versions(id), dependency_weight numeric check (dependency_weight between 0 and 1), payload jsonb not null);
create table public.route_usage (id text primary key, company_id text not null references public.companies(id), route_id text not null references public.routes(id), shipment_share numeric check (shipment_share between 0 and 1), payload jsonb not null);
create table public.evidence (id text primary key, dataset_version text not null references public.dataset_versions(id), payload jsonb not null);
create table public.weather_observations (id uuid primary key default gen_random_uuid(), facility_id text references public.facilities(id), fetched_at timestamptz not null, valid_time timestamptz not null, payload jsonb not null);
create table public.climate_projections (id uuid primary key default gen_random_uuid(), region_id text not null references public.regions(id), payload jsonb not null);

create table public.portfolios (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  name text not null, currency text not null default 'INR' check(currency='INR'),
  created_at timestamptz not null default now(), unique(id,owner_id)
);
create table public.holdings (
  id uuid primary key default gen_random_uuid(), portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  company_id text references public.companies(id), original_input_name text not null,
  amount numeric(24,8) not null check(amount>=0), currency text not null check(currency='INR'),
  matching_status text not null check(matching_status in ('matched','ambiguous','unmatched','excluded')),
  exclusion_reason text, check(matching_status <> 'matched' or company_id is not null),
  check(matching_status <> 'excluded' or exclusion_reason is not null)
);
create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(), portfolio_id uuid not null,
  owner_id uuid not null references auth.users(id), request_id text not null, input_hash text not null,
  snapshot jsonb not null, created_at timestamptz not null default now(),
  foreign key(portfolio_id,owner_id) references public.portfolios(id,owner_id),
  unique(owner_id,request_id)
);
create table public.analysis_results (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references public.analysis_runs(id), payload jsonb not null
);
create table public.assumption_overlays (
  id uuid primary key default gen_random_uuid(), portfolio_id uuid not null,
  owner_id uuid not null references auth.users(id), payload jsonb not null,
  foreign key(portfolio_id,owner_id) references public.portfolios(id,owner_id)
);
create index holdings_portfolio_idx on public.holdings(portfolio_id);
create index portfolios_owner_idx on public.portfolios(owner_id);
create index runs_owner_idx on public.analysis_runs(owner_id);
create index results_run_idx on public.analysis_results(run_id);
create index overlays_owner_idx on public.assumption_overlays(owner_id);

-- Public operational datasets are read-only to browser roles; imports are admin-only.
do $$ declare tab text; begin
  foreach tab in array array['dataset_versions','companies','regions','facilities','routes','route_waypoints','commodities','supply_items','relationships','route_usage','evidence','weather_observations','climate_projections'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('revoke all on public.%I from anon, authenticated',tab);
    execute format('grant select on public.%I to anon, authenticated',tab);
    execute format('create policy public_read on public.%I for select to anon, authenticated using (true)',tab);
  end loop;
end $$;

alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.analysis_results enable row level security;
alter table public.assumption_overlays enable row level security;
revoke all on public.portfolios,public.holdings,public.analysis_runs,public.analysis_results,public.assumption_overlays from anon,authenticated;
grant select,insert,update,delete on public.portfolios,public.holdings,public.assumption_overlays to authenticated;
grant select,insert on public.analysis_runs,public.analysis_results to authenticated;
create policy portfolio_owner on public.portfolios to authenticated using (owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy holding_parent_owner on public.holdings to authenticated
  using(exists(select 1 from public.portfolios p where p.id=portfolio_id and p.owner_id=(select auth.uid())))
  with check(exists(select 1 from public.portfolios p where p.id=portfolio_id and p.owner_id=(select auth.uid())));
create policy run_owner_read on public.analysis_runs for select to authenticated
  using(owner_id=(select auth.uid()) and exists(select 1 from public.portfolios p where p.id=portfolio_id and p.owner_id=(select auth.uid())));
create policy run_owner_insert on public.analysis_runs for insert to authenticated
  with check(owner_id=(select auth.uid()) and exists(select 1 from public.portfolios p where p.id=portfolio_id and p.owner_id=(select auth.uid())));
create policy result_parent_read on public.analysis_results for select to authenticated
  using(exists(select 1 from public.analysis_runs r where r.id=run_id and r.owner_id=(select auth.uid())));
create policy result_parent_insert on public.analysis_results for insert to authenticated
  with check(exists(select 1 from public.analysis_runs r where r.id=run_id and r.owner_id=(select auth.uid())));
create policy overlay_parent_owner on public.assumption_overlays to authenticated
  using(owner_id=(select auth.uid()) and exists(select 1 from public.portfolios p where p.id=portfolio_id and p.owner_id=(select auth.uid())))
  with check(owner_id=(select auth.uid()) and exists(select 1 from public.portfolios p where p.id=portfolio_id and p.owner_id=(select auth.uid())));
commit;
