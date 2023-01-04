from typing import Any, NamedTuple, cast

import asyncio
import json
import logging

try:
    import uvloop # I dont want to install this thing in the fucking docker because it needs gcc
except:
    pass
import jwt

from datetime import datetime, timedelta, timezone
from websockets.server import WebSocketServerProtocol, serve as websocket_serve
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
from vcc import RpcExchanger, RpcExchangerClient, PermissionDeniedError

with open("config.json") as config_file:
    config = json.load(config_file)
    key = config["key"]

async def recv_loop(websocket: WebSocketServerProtocol, client: RpcExchangerClient) -> None:
    try:
        async for type, username, msg, chat in client:
            if type == "event":
                continue
            logging.debug(f"{username=} {msg=} {chat=}")
            json_msg = json.dumps({
                "type": "message",
                "uid": chat,
                "usrname": username,
                "msg": msg
            })
            if username == "system" and ("kick" in msg or "rename" in msg):
                await websocket.send(json.dumps({
                    "type": "chat_list_somebody_joined",
                    "uid": chat,
                    "usrname": username,
                    "msg": cast(Any, await client.chat_list())
                }))
            await websocket.send(json_msg)
    except ConnectionClosedOK:
        pass
    except ConnectionClosedError as e:
        logging.info(e)
    except Exception as e:
        logging.info(e, exc_info=True)
        await websocket.close(1008)

async def send_loop(websocket: WebSocketServerProtocol, client: RpcExchangerClient) -> None:
    try:
        async for json_msg in websocket:
            async def send(type: str, *, uid: int=0, username: str="", msg: str="") -> None:
                await websocket.send(json.dumps({
                    "type": type,
                    "uid": uid,
                    "usrname": username,
                    "msg": msg
                }))
            json_result = json.loads(json_msg)
            username: str = json_result["usrname"]
            uid: int = json_result["uid"]
            msg: str = json_result["msg"]
            match json_result["type"]:
                case "login":
                    login_result = await client.login(username, msg)
                    if login_result is not None:
                        token = jwt.encode({
                            "username": username,
                            "uid": login_result,
                            "exp": datetime.now(tz=timezone.utc) + timedelta(days=14)
                        }, key, "HS512")
                    else:
                        token = ""
                    await send(
                        "login",
                        uid=cast(Any, None if login_result is None else int(login_result)),
                        msg=token
                    )
                    if login_result is not None:
                        value = await client.chat_list()
                        logging.debug(f"{value=}")
                        await send("chat_list_somebody_joined", msg=cast(Any, value))
                case "token_login":
                    try:
                        result = jwt.decode(msg, key, ["HS512"])
                        new_username: str = result["username"]
                        new_uid: int = result["uid"]
                        await send(
                            "token_login",
                            uid=new_uid,
                            username=new_username
                        )
                        # Dangerous! Don't do it in your own project.
                        client._uid = new_uid
                        client._username = new_username
                        value = await client.chat_list()
                        logging.debug(f"{value=}")
                        await send("chat_list_somebody_joined", msg=cast(Any, value))
                    except (jwt.DecodeError, KeyError):
                        await send(
                            "token_login",
                            uid=cast(Any, None),
                            username=""
                        )
                case "register":
                    await send("register", uid=int(await client.register(username, msg)))
                case "message":
                    try:
                        await client.send(msg, uid)
                    except PermissionDeniedError:
                        pass
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
                case "chat_list_somebody_joined":
                    value = await client.chat_list()
                    await send("chat_list_somebody_joined", msg=cast(Any, value))
                case "chat_get_users":
                    await send("chat_get_users", msg=cast(Any, await client.chat_get_users(uid)))
                case "chat_rename":
                    await send("chat_rename", uid=int(await client.chat_rename(uid, msg)))
                case "chat_kick":
                    await send("chat_kick", uid=int(await client.chat_kick(uid, int(msg))))
                case "chat_modify_user_permission":
                    data = cast(Any, msg)
                    await send("chat_modify_user_permission", uid=int(await client.chat_modify_user_permission(data["chat_id"], data["modified_user_id"], data["name"], data["value"])))
                case "chat_get_all_permission":
                    await send("chat_get_all_permission", msg=cast(Any, await client.chat_get_all_permission(uid)))
                case "chat_generate_invite":
                    token = jwt.encode({
                        "": [uid, client.uid],
                        "exp": datetime.now(tz=timezone.utc) + timedelta(days=14)
                    }, key, "HS256")
                    await send("chat_generate_invite", msg=token)
                case "chat_check_invite":
                    try:
                        result = jwt.decode(msg, key, ["HS256"])
                        await send(
                            "chat_check_invite",
                            uid=result[""][1],
                            msg=result[""][0]
                        )
                    except (jwt.DecodeError, KeyError):
                        await send(
                            "chat_check_invite",
                            uid=cast(Any, None)
                        )
                case "chat_invite":
                    try:
                        result = jwt.decode(msg, key, ["HS256"])
                        await send("chat_invite", uid=int(await client.chat_invite(chat_id=result[""][0], user_id=result[""][1])))
                    except (jwt.DecodeError, KeyError):
                        await send(
                            "chat_invite",
                            uid=cast(Any, None)
                        )
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
        done, pending = await asyncio.wait([send_loop_task, recv_loop_task], return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
 
async def main() -> None:
    logging.basicConfig(level=logging.DEBUG)
    logging.getLogger("websockets.server").setLevel(logging.INFO)
    async with RpcExchanger() as exchanger:
        async with websocket_serve(lambda ws: loop(ws, exchanger), "", 7000):
            logging.info("started: ws://localhost:7000")
            await asyncio.Future()

uvloop.install()
asyncio.run(main())
