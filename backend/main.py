from typing import NamedTuple

import asyncio
import json
import logging
import redis.asyncio as redis
from functools import partial

from websockets.server import WebSocketServerProtocol, serve as websocket_serve
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
import uvloop

from vcc import RpcExchanger, RpcExchangerClient

async def recv_loop(websocket: WebSocketServerProtocol, client: RpcExchangerClient) -> None:
    try:
        async for username, msg, chat in client:
            logging.debug(f"{username=} {msg=} {chat=}")
            json_msg = json.dumps({
                "type": "message",
                "uid": chat,
                "usrname": username,
                "msg": msg
            })
            await websocket.send(json_msg)
    except ConnectionClosedOK:
        pass
    except ConnectionClosedError as e:
        logging.info(e)
    except Exception as e:
        logging.info(e, exc_info=True)
        await websocket.close(1008)

async def websocket_send(websocket: WebSocketServerProtocol, *, type: str, uid: int=0, username: str="", msg: str="") -> None:
    await websocket.send(json.dumps({
        "type": type,
        "uid": uid,
        "usrname": username,
        "msg": msg
    }))

async def send_loop(websocket: WebSocketServerProtocol, client: RpcExchangerClient) -> None:
    async def send(type: str, *, uid: int=0, username: str="", msg: str="") -> None:
        await websocket.send(json.dumps({
            "type": type,
            "uid": uid,
            "usrname": username,
            "msg": msg
        }))
    try:
        async for json_msg in websocket:
            json_result = json.loads(json_msg)
            username: str = json_result["usrname"]
            uid: int = json_result["uid"]
            msg: str = json_result["msg"]
            match json_result["type"]:
                case "login":
                    login_result = await client.login(username, msg)
                    await send(
                        type="login",
                        uid=int(login_result)
                    )
                    if login_result is not None:
                        await client.chat_join(1)
                case "message":
                    await client.send(msg, uid)
                case "chat_create":
                    await send("chat_create", uid=await client.chat_create(username))
                case "chat_join":
                    # also return session name
                    join_successfully = await client.chat_join(uid)
                    if not join_successfully:
                        await send("chat_join", uid=0)
                    await send("chat_join", uid=1, username=await client.chat_get_name(uid))
                case "chat_quit":
                    await send("chat_quit", uid=int(await client.chat_quit(uid)))
                case "chat_get_name":
                    await send("chat_get_name", username=await client.chat_get_name(uid))
                case _:
                    await websocket.close(1008)
                    return
    except ConnectionClosedOK:
        pass
    except ConnectionClosedError as e:
        logging.info(e)
    except Exception as e:
        logging.info(e, exc_info=True)
        await websocket.close(1008)


async def loop(websocket: WebSocketServerProtocol, exchanger: RpcExchanger) -> None:
    send_loop_task: asyncio.Task[None]
    recv_loop_task: asyncio.Task[None]
    remote_ip: str = websocket.remote_address[0]
    logging.info(f"{websocket.id}:{remote_ip} connected")
    async with exchanger.create_client() as client:
        send_loop_task = asyncio.create_task(send_loop(websocket, client))
        recv_loop_task = asyncio.create_task(recv_loop(websocket, client))
        await asyncio.gather(send_loop_task, recv_loop_task)

async def main() -> None:
    logging.basicConfig(level=logging.DEBUG)
    async with RpcExchanger() as exchanger:
        async with websocket_serve(lambda ws: loop(ws, exchanger), "", 7000):
            logging.info("started: ws://localhost:7000")
            await asyncio.Future()

uvloop.install()
asyncio.run(main())
