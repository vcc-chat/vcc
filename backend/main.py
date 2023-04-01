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
from sanic import Sanic, Request, Websocket
from sanic.response import text,file_stream
from sanic.exceptions import NotFound
from limits import parse
from limits.aio.storage import RedisStorage
from limits.aio.storage import MemoryStorage
from limits.aio.strategies import MovingWindowRateLimiter

#redis_storage = RedisStorage("async+"+os.getenv("REDIS_URL", "redis://localhost:6379") , protocol_version=2)

moving_window = MovingWindowRateLimiter(MemoryStorage())
per_minute = parse("40/minute")

async def rate_limit(ip: str):
   need_wait = await moving_window.hit(per_minute, ip)
   if need_wait:
        while not moving_window.test(per_minute, ip):
            await asyncio.sleep(0.01)

confpath = os.getenv("WEBVCC_CONFPATH", "config.json")#FIXME: I dont think a file just for key is a good idea
static_base = os.path.dirname(sys.argv[0])+"/static"
if not os.path.exists(confpath):
    json.dump({"key":str(uuid4())},open(confpath,"w"))
with open(confpath) as config_file:
    config = json.load(config_file)
    key = config["key"]

app = Sanic(name="web-vcc")
app.ctx.exchanger = RpcExchanger()
async def recv_loop(websocket: Websocket, client: RpcExchangerClient) -> None:
    try:
        async for result in client:
            if result[0] == "event":
                json_msg = json.dumps({
                    "type":"event",
                    "uid" :result[3],
                    "msg" :result[2], #FIXME: I dont know if it will break client side because this may be a dict
                })
                await websocket.send(json_msg)
                continue
            _, username, msg, chat, session = result
            logging.debug(f"{username=} {msg=} {chat=}")
            json_msg = json.dumps({
                "type": "message",
                "uid": chat,
                "usrname": username,
                "msg": msg,
                "session": session
            })
            if username == "system" and ("kick" in msg or "rename" in msg):
                await websocket.send(json.dumps({
                    "type": "chat_list",
                    "uid": chat,
                    "usrname": username,
                    "msg": cast(Any, await client.chat_list())
                }))
            await websocket.send(json_msg)
    except Exception as e:
        logging.info(e, exc_info=True)
        await websocket.close(1008)
async def handle_request(websocket: Websocket, client: RpcExchangerClient, json_msg: str | bytes):
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

    try:
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
                    await send("chat_list", msg=cast(Any, value))
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
                    await send(
                        "token_login",
                        uid=cast(Any, None),
                        username=""
                    )
            case "request_oauth":
                url, request_id = await client.request_oauth(msg)
                await send("request_oauth", username=request_id, msg=url)
            case "login_oauth":
                login_result = await client.login_oauth(username, msg)
                if login_result is not None:
                    # await client.chat_list()
                    token = jwt.encode({
                        "username": client.name,
                        "uid": login_result,
                        "exp": datetime.now(tz=timezone.utc) + timedelta(days=14)
                    }, key, "HS512")
                else:
                    token = ""
                await send(
                    "login_oauth",
                    uid=cast(Any, None if login_result is None else int(login_result)),
                    username=cast(str, client.name),
                    msg=token
                )
                if login_result is not None:
                    value = await client.chat_list()
                    logging.debug(f"{value=}")
                    await send("chat_list_somebody_joined", msg=cast(Any, value))

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
                await send("chat_create", uid=await client.chat_create(username, -1 if uid == 0 or uid==None else uid))
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
            case "chat_list":
                value = await client.chat_list()
                await send("chat_list", msg=cast(Any, value))
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
            case "record_query":
                # client.check_authorized()
                # client.check_joined(uid)
                # result = await client._exchanger.rpc.record.query_record(chatid=uid, time=int(msg))
                # await send("record_query", msg=result)
                # FIXME: Temporily disable support for chat record
                await send("record_query", msg=cast(Any, []))
            case _:
                await websocket.close(1008)
                return
    except asyncio.CancelledError:
        pass

async def send_loop(websocket: Websocket, client: RpcExchangerClient, ip: str) -> None:
    task_list: set[asyncio.Task[None]] = set()
    try:
        async for json_msg in websocket:
            if json_msg is None:
                break
            await rate_limit(ip)
            task_list.add(asyncio.create_task(handle_request(websocket, client, json_msg)))
    except Exception as e:
        logging.info(e, exc_info=True)
        await websocket.close(1008, ",".join(e.args))
    finally:
        for i in task_list:
            i.cancel()

@app.websocket("/ws")
async def loop(request: Request, websocket: Websocket,retry=False) -> None:
    try:
        async with app.ctx.exchanger.create_client() as client:
            ip: str = request.ip if request.ip != "127.0.0.1" else request.headers["X-Real-IP"]
            send_loop_task = asyncio.create_task(send_loop(websocket, client, ip))
            recv_loop_task = asyncio.create_task(recv_loop(websocket, client))
            done, pending = await asyncio.wait([send_loop_task, recv_loop_task], return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
    except BrokenPipeError:
        if retry:
            await request.respond(text("error"), status=500)
        #await app.ctx.exchanger.__aexit__(None,None,None)
        await app.ctx.exchanger.__aenter__()
        return cast(None, await loop(request, websocket, retry=True))

@app.before_server_start
async def init_exchanger(*_):
    await app.ctx.exchanger.__aenter__()

@app.after_server_stop
async def destroy_exchanger(*_):
    await app.ctx.exchanger.__aexit__(None, None, None)

if os.getenv("WEBVCC_DISABLE_STATIC") is None:
    app.static("/", static_base)
    @app.exception(NotFound, IsADirectoryError)
    async def ignore_404s(request, exception):
        return await  file_stream(static_base / "index.html")

app.config.WEBSOCKET_MAX_SIZE = 1 << 13

logging.getLogger("vcc.vcc").setLevel(logging.DEBUG)
if __name__ == "__main__":
    app.run(os.environ.get("WEBVCC_ADDR", "0.0.0.0"), 2479, access_log=True)
'['
