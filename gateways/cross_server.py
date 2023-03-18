import asyncio
import json
import os
import weakref
import functools

from websockets import serve, broadcast

import vcc.vcc as vcc

allow_list = os.getenv("VCC_SAFE_SERVERS", "127.0.0.1,::1").split(",")

async def websocket_send(websocket, id, data=None):
    await websocket.send(json.dumps({
        "data": data,
        "id": id
    }))

websocket_recv_list = weakref.WeakSet()

async def handle(text, websocket, exchanger: vcc.RpcExchanger):
    data = json.loads(text)
    service = data["service"]
    send = functools.partial(websocket_send, websocket, data["id"])
    if service == "message/send_message":
        await exchanger._redis.publish("messages", json.dumps(data["data"]))
        await send(None)
    elif service == "message/send_event":
        await exchanger._redis.publish("events", json.dumps(data["data"]))
        await send(None)
    elif service == "message/start_recv":
        websocket_recv_list.add(websocket)
        await send(None)
    else:
        await send(await exchanger.rpc_request(data["service"], data["data"]))

async def handler(exchanger: vcc.RpcExchanger, websocket):
    if websocket.remote_address[0] not in allow_list:
        await websocket.close(1008, "Disallowed server")
        return
        
    task_list: set[asyncio.Task] = set()
    try:
        async for i in websocket:
            task_list.add(asyncio.create_task(handle(i, websocket, exchanger)))
    finally:
        websocket_recv_list.discard(websocket)
        for task in task_list:
            task.cancel()

async def broadcast_task(exchanger: vcc.RpcExchanger):
    async for rpc_message in exchanger.pubsub.listen():
        broadcast(websocket_recv_list, rpc_message["data"].decode())

async def main():
    async with vcc.RpcExchanger() as exchanger:
        exchanger._recv_task.cancel()
        task = asyncio.create_task(broadcast_task(exchanger))
        try:
            async with serve(lambda websocket: handler(exchanger, websocket), "", 2478):
                await asyncio.Future()
        finally:
            task.cancel()

asyncio.run(main())