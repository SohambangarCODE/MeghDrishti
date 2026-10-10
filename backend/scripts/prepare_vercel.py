"""Package the unchanged canonical reference fixture at build time, not runtime."""
from pathlib import Path
import hashlib
import json


def prepare():
    backend = Path(__file__).resolve().parents[1]
    source = backend.parent / 'frontend/src/fixtures/reference.json'
    if not source.is_file():
        raise SystemExit('Reference fixture missing: enable Include source files outside of the Root Directory in Vercel and deploy the complete repository.')
    raw = source.read_bytes()
    fixture = json.loads(raw)
    if not all(name in fixture for name in ('dataset', 'holdings', 'scenario')):
        raise SystemExit('Reference fixture format is invalid.')
    destination = backend / 'fixtures/reference.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(raw)
    if hashlib.sha256(destination.read_bytes()).digest() != hashlib.sha256(raw).digest():
        raise SystemExit('Packaged reference fixture integrity check failed.')
    print('Packaged canonical reference fixture unchanged; no credentials included.')


if __name__ == '__main__':
    prepare()
