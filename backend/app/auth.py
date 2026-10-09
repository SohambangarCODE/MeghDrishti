import os
from functools import lru_cache
import jwt
from fastapi import HTTPException, Header

@lru_cache
def signing_keys(issuer):
    return jwt.PyJWKClient(issuer.rstrip('/')+'/.well-known/jwks.json',cache_keys=True,lifespan=300,timeout=5)

def verify_token(token):
    issuer=os.getenv('SUPABASE_JWT_ISSUER') or (os.getenv('SUPABASE_URL','').rstrip('/')+'/auth/v1' if os.getenv('SUPABASE_URL') else '')
    if not issuer: raise HTTPException(503,detail='Authentication not configured')
    try:
        key=signing_keys(issuer).get_signing_key_from_jwt(token)
        claims=jwt.decode(token,key.key,algorithms=['ES256','RS256'],issuer=issuer,
                          audience=os.getenv('SUPABASE_JWT_AUDIENCE','authenticated'),
                          options={'require':['sub','exp','iss','aud']})
        if claims.get('role')!='authenticated': raise ValueError('Invalid role')
        return claims['sub']
    except Exception as exc:
        raise HTTPException(401,detail='Invalid or expired authentication') from exc

def identity(authorization: str | None = Header(default=None), x_demo_session: str | None = Header(default=None)):
    if authorization:
        if not authorization.startswith('Bearer '): raise HTTPException(401,detail='Bearer token required')
        return verify_token(authorization[7:])
    # This is a local synthetic demo capability, not authentication or production privacy.
    if x_demo_session and 16 <= len(x_demo_session) <= 128:
        return 'demo:'+x_demo_session
    raise HTTPException(401,detail='Demo session header or configured authentication required')
