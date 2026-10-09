-- Integration test for a disposable/local Supabase DB after migration. Rollback leaves no fixtures.
begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into public.portfolios(id,owner_id,name) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','A'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','B');
insert into public.analysis_runs(id,portfolio_id,owner_id,request_id,input_hash,snapshot) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','test','hash','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if (select count(*) from public.portfolios) <> 1 then raise exception 'Portfolio isolation failed'; end if;
 if (select count(*) from public.analysis_runs) <> 0 then raise exception 'Run isolation failed'; end if;
 begin
   insert into public.holdings(portfolio_id,original_input_name,amount,currency,matching_status)
   values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','foreign holding',10,'INR','unmatched');
   raise exception 'Foreign child insert was allowed';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.analysis_results(run_id,payload) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','{}');
   raise exception 'Foreign result insert was allowed';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.assumption_overlays(portfolio_id,owner_id,payload)
   values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','{}');
   raise exception 'Foreign overlay insert was allowed';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
