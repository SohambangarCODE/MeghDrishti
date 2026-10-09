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
do $$ declare changed integer; saved jsonb; repeated jsonb; begin
 if (select count(*) from public.portfolios) <> 1 then raise exception 'Portfolio isolation failed'; end if;
 if (select count(*) from public.analysis_runs) <> 0 then raise exception 'Run isolation failed'; end if;
 update public.portfolios set name='Forbidden' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Foreign update allowed'; end if;
 delete from public.analysis_runs where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Foreign delete allowed'; end if;
 if public.delete_portfolio('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then raise exception 'Foreign RPC deletion allowed'; end if;
 saved=public.save_portfolio('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A updated','test-version',
  '[{"companyId":null,"originalInputName":"Unmatched test","amount":10,"currency":"INR","matchingStatus":"unmatched","exclusionReason":null}]',
  '{"assumptionOverrides":[]}');
 if saved->>'owner_id'<>'11111111-1111-4111-8111-111111111111' then raise exception 'Owner changed'; end if;
 saved=public.save_analysis('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',jsonb_build_object(
  'id','dddddddd-dddd-4ddd-8ddd-dddddddddddd','requestId','test-idempotency','inputHash',repeat('a',64),
  'ownerId','22222222-2222-4222-8222-222222222222','totals','{}'::jsonb,'holdingsResults','[]'::jsonb));
 repeated=public.save_analysis('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',saved);
 if saved<>repeated or saved->>'ownerId'<>'11111111-1111-4111-8111-111111111111' then raise exception 'Idempotency/owner override failed'; end if;
 if (select count(*) from public.analysis_results)<>1 then raise exception 'Result parent read isolation failed'; end if;
 begin
  perform public.save_analysis('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',saved || jsonb_build_object('inputHash',repeat('b',64)));
  raise exception 'Idempotency conflict allowed';
 exception when unique_violation then null; end;
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
 if not public.delete_portfolio('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'Own delete failed'; end if;
 if exists(select 1 from public.analysis_runs) or exists(select 1 from public.holdings) or exists(select 1 from public.analysis_results) then raise exception 'Delete did not cascade'; end if;
end $$;
set local role anon;
do $$ begin
 begin
  perform 1 from public.portfolios;
  raise exception 'Anonymous private read granted';
 exception when insufficient_privilege then null; end;
 begin
  perform public.delete_portfolio('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  raise exception 'Anonymous private RPC granted';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
