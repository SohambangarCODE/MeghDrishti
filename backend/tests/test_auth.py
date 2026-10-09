from datetime import datetime,timedelta,timezone
from types import SimpleNamespace
from cryptography.hazmat.primitives.asymmetric import rsa
import jwt
import pytest
from fastapi import HTTPException
import app.auth as auth

def test_verified_signature_issuer_audience_expiry_and_role(monkeypatch):
    private=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    issuer='https://example.supabase.co/auth/v1'
    monkeypatch.setenv('SUPABASE_JWT_ISSUER',issuer)
    monkeypatch.setenv('SUPABASE_JWT_AUDIENCE','authenticated')
    monkeypatch.setattr(auth,'signing_keys',lambda _:SimpleNamespace(get_signing_key_from_jwt=lambda token:SimpleNamespace(key=private.public_key())))
    claims={'sub':'owner-a','iss':issuer,'aud':'authenticated','exp':datetime.now(timezone.utc)+timedelta(minutes=1),'role':'authenticated'}
    def token(payload,key=private):return jwt.encode(payload,key,algorithm='RS256')
    assert auth.verify_token(token(claims))=='owner-a'
    for changes in [{'iss':'https://wrong.example'},{'aud':'wrong'},{'role':'service_role'},{'exp':datetime.now(timezone.utc)-timedelta(minutes=1)}]:
        with pytest.raises(HTTPException) as error:auth.verify_token(token({**claims,**changes}))
        assert error.value.status_code==401
    different=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    with pytest.raises(HTTPException):auth.verify_token(token(claims,different))
