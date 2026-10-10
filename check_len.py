import os, json
for root, dirs, files in os.walk('.'):
    if 'venv' in root or 'node_modules' in root: continue
    for f in files:
        if f.endswith('.json'):
            try:
                d = json.load(open(os.path.join(root,f), encoding='utf-8'))
                if 'companies' in d:
                    print(f'{root}/{f} companies: {len(d["companies"])}')
                elif 'dataset' in d and 'companies' in d['dataset']:
                    print(f'{root}/{f} dataset companies: {len(d["dataset"]["companies"])}')
            except Exception: pass

