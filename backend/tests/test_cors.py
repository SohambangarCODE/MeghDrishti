"""Production frontend CORS access without granting private API authorization."""
import pytest
from fastapi.testclient import TestClient
from app.config import allowed_origins
from app.main import app


FRONTEND = 'https://megh-drishti-frontend.vercel.app'


@pytest.mark.parametrize('path', ['/api/v1/datasets', '/api/v1/demo?datasetId=climateweb'])
def test_deployed_frontend_can_read_installed_dataset(path):
    with TestClient(app) as client:
        response = client.get(path, headers={'Origin': FRONTEND})
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == FRONTEND
    assert 'access-control-allow-credentials' not in response.headers
    body = response.json()
    if path == '/api/v1/datasets':
        assert any(dataset['id'] == 'climateweb' for dataset in body['datasets'])
    else:
        assert body['dataset']['datasetVersion'].startswith('climateweb:')


def test_private_analysis_preflight_accepts_bearer_and_json_headers():
    with TestClient(app) as client:
        response = client.options('/api/v1/private/analysis', headers={
            'Origin': FRONTEND,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type,Authorization',
        })
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == FRONTEND
    headers = {header.strip().lower() for header in response.headers['access-control-allow-headers'].split(',')}
    assert {'authorization', 'content-type'} <= headers
    assert 'POST' in response.headers['access-control-allow-methods']
    assert 'access-control-allow-credentials' not in response.headers


@pytest.mark.parametrize('origin', [
    'https://unrelated.example',
    'https://megh-drishti-frontend.vercel.app.unrelated.example',
    'http://megh-drishti-frontend.vercel.app',
])
def test_unrelated_origins_cannot_pass_private_api_preflight(origin):
    with TestClient(app) as client:
        response = client.options('/api/v1/private/analysis', headers={
            'Origin': origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type,Authorization',
        })
    assert response.status_code == 400
    assert 'access-control-allow-origin' not in response.headers


def test_configured_origins_normalize_spaces_slashes_and_duplicates(monkeypatch):
    monkeypatch.setenv('ALLOWED_ORIGINS', ' https://configured.example/ ,  ,https://configured.example , http://127.0.0.1:5173/ ')
    origins = allowed_origins()
    assert 'https://configured.example' in origins
    assert 'http://127.0.0.1:5173' in origins
    assert FRONTEND in origins
    assert origins.count('https://configured.example') == 1
    assert all(origin and origin == origin.strip().rstrip('/') for origin in origins)
    assert '*' not in origins


def test_request_without_origin_keeps_normal_api_response():
    with TestClient(app) as client:
        response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
    assert 'access-control-allow-origin' not in response.headers


def test_cors_permission_does_not_authorize_private_analysis():
    with TestClient(app) as client:
        response = client.post('/api/v1/private/analysis', json={}, headers={'Origin': FRONTEND})
    assert response.status_code == 401
    assert response.headers['access-control-allow-origin'] == FRONTEND
    assert response.json()['error']['code'] == 'HTTP_401'
