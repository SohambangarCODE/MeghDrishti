"""Migration-only administrator connection; never used by application requests."""
import argparse,os,sys
from pathlib import Path
import psycopg
ROOT=Path(__file__).parents[1]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');parser.add_argument('--test-rls',action='store_true');args=parser.parse_args()
    for line in (ROOT/'backend/.env.local').read_text(encoding='utf-8-sig').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k,v=line.split('=',1);os.environ.setdefault(k.strip(),v.strip().strip('"').strip("'"))
    url=os.environ.get('DATABASE_URL')
    if not url:raise SystemExit('DATABASE_URL missing in backend/.env.local')
    try:
        with psycopg.connect(url,connect_timeout=10,autocommit=True) as conn:
            tables={r[0] for r in conn.execute("select tablename from pg_tables where schemaname='public'")}
            print('Database reachable. Existing application tables:',sorted(tables.intersection({'portfolios','analysis_runs','app_migrations','companies'})))
            if args.apply:
                if 'portfolios' not in tables:
                    collision=tables.intersection({'companies','dataset_versions','holdings','analysis_runs','regions','facilities','routes','evidence'})
                    if collision:raise SystemExit('Existing table names conflict; migration stopped for review')
                    conn.execute((ROOT/'supabase/migrations/202610090001_initial.sql').read_text(encoding='utf-8'))
                    print('Applied initial migration')
                applied={r[0] for r in conn.execute('select version from public.app_migrations')} if 'app_migrations' in tables else set()
                if '202610090002_private_workflows' not in applied:
                    conn.execute((ROOT/'supabase/migrations/202610090002_private_workflows.sql').read_text(encoding='utf-8'))
                    print('Applied private-workflow migration')
            if args.test_rls:
                conn.execute((ROOT/'supabase/tests/owner_isolation.sql').read_text(encoding='utf-8'))
                print('Transactional owner-isolation SQL test passed (fixtures rolled back)')
            if args.apply:print('Recorded migrations:',[r[0] for r in conn.execute('select version from public.app_migrations order by version')])
    except psycopg.Error as exc:
        # Never print connection strings, passwords or raw database errors.
        message=str(exc).lower()
        reason='authentication rejected' if 'password authentication' in message else 'DNS/host resolution failed' if any(x in message for x in ['resolve','name or service','nodename','getaddrinfo']) else 'network connection failed' if not exc.sqlstate else 'database operation rejected'
        print(f'Database verification failed: {reason}; type={type(exc).__name__}; SQLSTATE={exc.sqlstate or "unavailable"}. Credentials not printed.')
        sys.exit(1)

if __name__=='__main__':main()
