"""Validate genuine CCKP XLSX locally; writes require --install or --quarantine."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parents[1]))
from app.cckp_xlsx import inspect_pair, install_pair, quarantine_pair
from app.projections import ROOT


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--historical', required=True)
    parser.add_argument('--future', required=True)
    parser.add_argument('--output', default=str(ROOT))
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument('--install', action='store_true')
    actions.add_argument('--quarantine', action='store_true')
    args = parser.parse_args()
    try:
        destination = None
        if args.install:
            report = install_pair(args.historical, args.future, args.output)
        elif args.quarantine:
            report, destination = quarantine_pair(args.historical, args.future, args.output)
        else:
            report = inspect_pair(args.historical, args.future)
        print(json.dumps({'action': 'install' if args.install else 'quarantine' if args.quarantine else 'validate-only',
                          'status': report['status'], 'output': str(destination) if destination else None,
                          'sources': [{'file': s['sourceFile'], 'sha256': s['sha256'],
                                       'normalizedContentHash': s['normalizedContentHash'],
                                       'verificationStatus': s['verificationStatus'], 'reason': s['reason'],
                                       'values': [r['value'] for r in s['candidateRecords']]} for s in report['sources']],
                          'comparisons': report['comparisons']}, indent=2))
        return 0
    except (ValueError, OSError, KeyError) as exc:
        print(f'CCKP import failed: {exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
