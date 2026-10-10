"""Load local backend settings without logging credentials or overriding deployment env."""
import os
from pathlib import Path


def allowed_origins():
    """Allow configured clients and the explicitly approved deployed frontend."""
    configured = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
    origins = [origin.strip().rstrip('/') for origin in configured.split(',') if origin.strip()]
    # Keep the deployed UI usable when an old localhost setting is carried over.
    origins.append('https://megh-drishti-frontend.vercel.app')
    return list(dict.fromkeys(origins))


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
