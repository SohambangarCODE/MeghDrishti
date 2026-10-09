from fastapi.testclient import TestClient
from app.main import app

def test_readiness_does_not_claim_external_connection_and_limits_body():
    with TestClient(app) as client:
        response=client.get('/ready')
        assert response.status_code==200 and response.json()['datasets']>=1
        assert 'Requires authenticated' in response.json()['cloudVerification']
        assert response.headers['x-request-id']
        assert client.post('/api/v1/portfolio/validate',content=b' '*2_000_001).status_code==413
