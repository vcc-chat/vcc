import asyncio
import json
import os
import weakref

from websockets.server import serve, broadcast

import vcc.vcc as vcc

allow_list = os.getenv("VCC_SAFE_SERVERS", "").split(",")

async def handle(text, websocket, exchanger: vcc.RpcExchanger):
    data = json.loads(text)
    service = data["service"]
    if service == "message/send_message":
        await exchanger._redis.publish("messages", json.dumps(data["data"]))
        await websocket.send(json.dumps({
            "data": None,
            "id": data["id"]
        }))
    elif service == "message/send_event":
        await exchanger._redis.publish("events", json.dumps(data["data"]))
        await websocket.send(json.dumps({
            "data": None,
            "id": data["id"]
        }))
    else:
        await websocket.send(json.dumps({
            "data": await exchanger.rpc_request(data["service"], data["data"]),
            "id": data["id"]
        }))

websocket_list = weakref.WeakSet()

async def handler(exchanger: vcc.RpcExchanger, websocket):
    if websocket.remote_address[0] not in websocket:
        await websocket.close(1008, "Disallowed server")
        return
    task_list: set[asyncio.Task] = set()
    try:
        websocket_list.add(websocket)
        async for i in websocket:
            task_list.add(handle(i, websocket, exchanger))
    finally:
        websocket_list.discard(websocket)
        for task in task_list:
            task.cancel()

async def broadcast_task(exchanger: vcc.RpcExchanger):
    async for rpc_message in exchanger.pubsub.listen():
        broadcast(websocket_list, rpc_message["data"])

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