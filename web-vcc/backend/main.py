from inspect import trace
from typing import Any, NamedTuple, cast

import os
import asyncio
import json
import logging
import jwt
import sys
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from pathlib import Path

from vcc import RpcExchanger, RpcExchangerClient, PermissionDeniedError
from sanic import Sanic, Request, Websocket, html
from sanic.response import text, file_stream
from sanic.exceptions import NotFound
from webpush import *
from methods import CloseException, Methods
from jsonrpc import JSONRPCResponseManager, Dispatcher

# redis_storage = RedisStorage("async+"+os.getenv("REDIS_URL", "redis://localhost:6379") , protocol_version=2)

# moving_window = MovingWindowRateLimiter(MemoryStorage())
# per_minute = parse("40/minute")

# async def rate_limit(ip: str):
#    need_wait = await moving_window.hit(per_minute, ip)
#    if need_wait:
#         while not moving_window.test(per_minute, ip):
#             await asyncio.sleep(0.01)

static_base = os.path.dirname(sys.argv[0]) + "/static"

app = Sanic(name="web-vcc")
app.ctx.exchanger = RpcExchanger()


async def recv_loop(websocket: Websocket, client: RpcExchangerClient) -> None:
    try:
        async for result in client:
            if result[0] == "event":
                # FIXME: allow events
                # json_msg = json.dumps(
                #     {
                #         "type": "event",
                #         "uid": result[3],
                #         "msg": result[
                #             2
                #         ],  # FIXME: I dont know if it will break client side because this may be a dict
                #     }
                # )
                # await websocket.send(json_msg)
                continue
            _, message= result
            json_msg = json.dumps(
                {
                    "method": "message",
                    "params": message,
                    "jsonrpc": "2.0",
                }
            )
            await websocket.send(json_msg)
    except Exception as e:
        logging.info(e, exc_info=True)
        await websocket.close(1008)


async def rpc_awaiter(response, websocket: Websocket):
    data = response.data

    # Note that data may be batch
    for i in data if isinstance(data, list) else [data]:
        if "error" in i:
            continue
        try:
            i["result"] = await i["result"]
        except CloseException:
            await websocket.close(1008)
        except Exception as e:
            logging.warn("Uncaught exception", exc_info=e)
            await websocket.close(1008)

    await websocket.send(json.dumps(data))


async def send_loop(
    websocket: Websocket, client: RpcExchangerClient, request: Request
) -> None:
    task_list: set[asyncio.Task[None]] = set()
    dispatcher = Dispatcher(Methods(client))
    try:
        async for json_msg in websocket:
            response = JSONRPCResponseManager.handle(json_msg, dispatcher)
            if json_msg is None:
                break
            # await rate_limit(ip)
            task_list.add(asyncio.create_task(rpc_awaiter(response, websocket)))
    except Exception as e:
        logging.info(e, exc_info=True)
        await websocket.close(1008, ",".join(e.args))
    finally:
        for i in task_list:
            i.cancel()


@app.before_server_start
async def init_exchanger(*_):
    await app.ctx.exchanger.__aenter__()
    register_recv_hook(app.ctx.exchanger)


@app.after_server_stop
async def destroy_exchanger(*_):
    await app.ctx.exchanger.__aexit__(None, None, None)


if os.getenv("WEBVCC_DISABLE_STATIC") is None:

    @app.exception(NotFound, IsADirectoryError)
    async def ignore_404s(request: Request, exception):
        print(request.path)
        if os.path.isfile(path := static_base + request.path):
            return await file_stream(static_base + request.path)
        else:
            return await file_stream(static_base + "/index.html")


@app.websocket("/ws")
async def loop(request: Request, websocket: Websocket) -> None:
    retry = False
    ip: str = (
        request.ip
        if request.ip != "127.0.0.1"
        else request.headers.get("X-Real-IP", "0.0.0.0")
    )
    logging.info(f"{request.id} at {ip} has connected")
    while True:
        try:
            async with app.ctx.exchanger.create_client() as client:
                send_loop_task = asyncio.create_task(
                    send_loop(websocket, client, request)
                )
                recv_loop_task = asyncio.create_task(recv_loop(websocket, client))
                done, pending = await asyncio.wait(
                    [send_loop_task, recv_loop_task],
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for task in pending:
                    task.cancel()
        except BrokenPipeError:
            if retry:
                await websocket.close(1001)
                return
            # await app.ctx.exchanger.__aexit__(None,None,None)
            await app.ctx.exchanger.__aenter__()
            retry = True
            continue
        break
    logging.info(f"{request.id} has disconnected")


@app.route("/oauth/<platform:str>/<requestid:str>")
async def procress_oauth(request:Request,platform,requestid):
    query=request.args
    query={a:b for a,b in list(map(lambda x:[x,query[x][0]],query.keys()))}
    await app.ctx.exchanger.rpc_request("oauth_"+platform,"procress_oauth",{'requestid':requestid,'query':query})
    return html("<script>window.close()</script>")


app.config.WEBSOCKET_MAX_SIZE = 1 << 13

logging.getLogger("vcc.vcc").setLevel(logging.DEBUG)
logging.getLogger().setLevel(logging.DEBUG)
if __name__ == "__main__":
    app.run(os.environ.get("WEBVCC_ADDR", "0.0.0.0"), 2479, access_log=True)
