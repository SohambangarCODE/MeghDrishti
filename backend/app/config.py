"""Load local backend settings without logging credentials or overriding deployment env."""
import os
from pathlib import Path


def load_local_environment():
    path = Path(__file__).parents[1] / '.env.local'
    if path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            name, value = line.removeprefix('export ').split('=', 1)
            name = name.strip()
            if name and name.replace('_', '').isalnum():
                value = value.strip()
                if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
                    value = value[1:-1]
                os.environ.setdefault(name, value)
