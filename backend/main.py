from typing import Any, NamedTuple, cast

import os
import asyncio
import json
import logging

try:
    import uvloop # I dont want to install this thing in the fucking docker because it needs gcc
    uvloop.install()
except:
    pass
import jwt

from uuid import uuid4
from datetime import datetime, timedelta, timezone
from websockets.server import WebSocketServerProtocol, serve as websocket_serve
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
from vcc import RpcExchanger, RpcExchangerClient, PermissionDeniedError

confpath = os.getenv("WEBVCC_CONFPATH", "config.json")

if not os.path.exists(confpath):
    json.dump({"key":str(uuid4())},open(confpath,"w"))
with open(confpath) as config_file:
    config = json.load(config_file)
    key = config["key"]

async def recv_loop(websocket: WebSocketServerProtocol, client: RpcExchangerClient) -> None:
    try:
        async for result in client:
            if result[0] == "event":
                continue
            _, username, msg, chat, session = result
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
            json_result = json.loads(json_msg)
            username: str = json_result.get("usrname")
            uid: int = json_result.get("uid")
            msg: str = json_result.get("msg")
            uuid: str = json_result.get("uuid", str(uuid4()))
            async def send(type: str, *, uid: int=0, username: str="", msg: str="") -> None:
                await websocket.send(json.dumps({
                    "type": type,
                    "uid": uid,
                    "usrname": username,
                    "msg": msg,
                    "uuid": uuid
                }))
            match json_result["type"]:
                case "login":
                    login_result = await client.login(username, msg)
                    if login_result is not None:
                        await client.chat_list()
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
                        # Dangerous! Don't do it in your own project.
                        client._id = result["uid"]
                        client._name = result["username"]
                        await client.chat_list()
                        await send(
                            "token_login",
                            uid=new_uid,
                            username=new_username
                        )
                        await client.add_online()
                    except (jwt.DecodeError, KeyError) as e:
                        print(e)
                        await send(
                            "token_login",
                            uid=cast(Any, None),
                            username=""
                        )
                case "is_online":
                    await send("is_online", msg=cast(Any, await client.is_online(cast(Any, msg))))
                case "register":
                    await send("register", uid=int(await client.register(username, msg)))
                case "message":
                    try:
                        await client.send(msg, uid, cast(Any, json_result)["session"] if "session" in json_result else None)
                    except PermissionDeniedError:
                        pass #FIXME: feedback to frontend
                case "session_join":
                    await send("session_join", uid=await client.session_join(msg, uid))
                case "chat_create":
                    await send("chat_create", uid=await client.chat_create(username, -1 if uid == 0 else uid))
                case "chat_join":
                    # also return session name
                    join_successfully = await client.chat_join(uid)
                    if not join_successfully:
                        await send("chat_join", uid=0)
                    else:
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
                case "chat_get_permission":
                    await send("chat_get_permission", msg=cast(Any, await client.chat_get_permission(uid)))
                case "chat_modify_permission":
                    await send("chat_modify_permission", uid=int(await client.chat_modify_permission(uid, cast(Any, username), bool(msg))))
                case "chat_generate_invite":
                    if uid not in client._chat_list:
                        raise PermissionDeniedError()
                    token = jwt.encode({
                        "": [uid, client.id],
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
                case "file_upload":
                    url, id = await client.file_new_object(msg)
                    await send("file_upload", username=id, msg=url)
                case "file_download":
                    url, name = await client.file_get_object(msg)
                    await send("file_download", username=name, msg=url)
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
    websocket.request_headers
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
        async with websocket_serve(lambda ws: loop(ws, exchanger), "127.0.0.1", 7000):
            logging.info("started: ws://localhost:7000")
            await asyncio.Future()

asyncio.run(main())
