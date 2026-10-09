"""Bounded request bodies and metadata-only request logs."""
import json
import logging
from time import perf_counter
from uuid import uuid4
from fastapi.responses import JSONResponse

logger=logging.getLogger('uvicorn.error')

class RequestBoundary:
    def __init__(self,app,max_bytes=2_000_000):self.app=app;self.max_bytes=max_bytes
    async def __call__(self,scope,receive,send):
        if scope['type']!='http':return await self.app(scope,receive,send)
        request_id=str(uuid4());start=perf_counter();status=500
        async def output(message):
            nonlocal status
            if message['type']=='http.response.start':
                status=message['status'];message['headers'].append((b'x-request-id',request_id.encode()))
            await send(message)
        try:
            messages=[];size=0
            while True:
                message=await receive()
                if message['type']=='http.disconnect':return
                size+=len(message.get('body',b''))
                if size>self.max_bytes:
                    response=JSONResponse(status_code=413,content={'error':{'code':'BODY_TOO_LARGE','message':'Request exceeds 2 MB','fieldErrors':[],'retryable':False}})
                    return await response(scope,receive,output)
                messages.append(message)
                if not message.get('more_body',False):break
            async def buffered():return messages.pop(0) if messages else await receive()
            await self.app(scope,buffered,output)
        finally:
            # Route templates only: no query, payload, bearer token, email, user or record ID.
            logger.info(json.dumps({'event':'http_request','requestId':request_id,'method':scope['method'],
                'route':getattr(scope.get('route'),'path','unmatched'),'status':status,'durationMs':round((perf_counter()-start)*1000,2)}))
