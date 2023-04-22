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
from sanic import Sanic, Request, Websocket
from sanic.response import text,file_stream
from sanic.exceptions import NotFound
from limits import parse
from limits.aio.storage import RedisStorage
from limits.aio.storage import MemoryStorage
from limits.aio.strategies import MovingWindowRateLimiter
from webpush import *

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
print(static_base)
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
            _, uid, username, msg, chat, session = result
            logging.debug(f"{username=} {msg=} {chat=}")
            json_msg = json.dumps({
                "type": "message",
                "uid": chat,
                "user_id": uid,
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
async def handle_request(websocket: Websocket, client: RpcExchangerClient, json_msg: str | bytes, request: Request):
    json_result = json.loads(json_msg)
    username: str = json_result.get("usrname")
    uid: int = json_result.get("uid")
    msg: str = json_result.get("msg")
    uuid: str = json_result.get("uuid", str(uuid4()))
    async def send(type: str = json_result["type"], *, uid: int=0, username: str="", msg: str="") -> None:
        await websocket.send(json.dumps({
            "type": type,
            "uid": uid,
            "usrname": username,
            "msg": msg,
            "uuid": uuid
        }))
    logging.info(f"New request: {json_result=}")
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
                        uid=new_uid,
                        username=new_username
                    )
                    await client.add_online()
                except (jwt.DecodeError, KeyError) as e:
                    await send(
                        uid=cast(Any, None),
                        username=""
                    )
            case "request_oauth":
                url, request_id = await client.request_oauth(msg)
                await send(username=request_id, msg=url)
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
                    uid=cast(Any, None if login_result is None else int(login_result)),
                    username=cast(str, client.name),
                    msg=token
                )
                if login_result is not None:
                    value = await client.chat_list()
                    logging.debug(f"{value=}")
                    await send("chat_list", msg=cast(Any, value))

            case "is_online":
                await send(msg=cast(Any, await client.is_online(cast(Any, msg))))
            case "register":
                await send(uid=int(await client.register(username, msg)))
            case "message":
                try:
                    await client.send(msg, uid, cast(Any, json_result)["session"] if "session" in json_result else None)
                except PermissionDeniedError:
                    pass #FIXME: feedback to frontend
            case "session_join":
                await send(uid=await client.session_join(msg, uid))
            case "chat_create":
                await send(uid=await client.chat_create(username, -1 if uid == 0 or uid==None else uid))
            case "chat_join":
                # also return session name
                join_successfully = await client.chat_join(uid)
                if not join_successfully:
                    await send(uid=0)
                else:
                    await send(uid=1, username=await client.chat_get_name(uid))
            case "chat_quit":
                await send(uid=int(await client.chat_quit(uid)))
            case "chat_get_name":
                await send(username=await client.chat_get_name(uid))
            case "chat_list":
                value = await client.chat_list()
                await send(msg=cast(Any, value))
            case "chat_get_users":
                await send(msg=cast(Any, await client.chat_get_users(uid)))
            case "chat_rename":
                await send(uid=int(await client.chat_rename(uid, msg)))
            case "chat_kick":
                await send(uid=int(await client.chat_kick(uid, int(msg))))
            case "chat_modify_user_permission":
                data = cast(Any, msg)
                await send(uid=int(await client.chat_modify_user_permission(data["chat_id"], data["modified_user_id"], data["name"], data["value"])))
            case "chat_get_all_permission":
                await send(msg=cast(Any, await client.chat_get_all_permission(uid)))
            case "chat_get_permission":
                await send(msg=cast(Any, await client.chat_get_permission(uid)))
            case "chat_modify_permission":
                await send(uid=int(await client.chat_modify_permission(uid, cast(Any, username), bool(msg))))
            case "chat_generate_invite":
                if uid not in client._chat_list:
                    raise PermissionDeniedError()
                token = jwt.encode({
                    "": [uid, client.id],
                    "exp": datetime.now(tz=timezone.utc) + timedelta(days=14)
                }, key, "HS256")
                await send(msg=token)
            case "chat_check_invite":
                try:
                    result = jwt.decode(msg, key, ["HS256"])
                    await send(uid=result[""][1], msg=result[""][0])
                except (jwt.DecodeError, KeyError):
                    await send(uid=cast(Any, None))
            case "chat_invite":
                try:
                    result = jwt.decode(msg, key, ["HS256"])
                    await send(uid=int(await client.chat_invite(chat_id=result[""][0], user_id=result[""][1])))
                except (jwt.DecodeError, KeyError):
                    await send(uid=cast(Any, None))
            case "file_upload":
                url, id = await client.file_new_object(msg)
                await send(username=id, msg=url)
            case "file_download":
                url, name = await client.file_get_object(msg)
                await send(username=name, msg=url)
            case "record_query":
                # client.check_authorized()
                # client.check_joined(uid)
                # result = await client._exchanger.rpc.record.query_record(chatid=uid, time=int(msg))
                # await send("record_query", msg=result)
                # FIXME: Temporily disable support for chat record
                await send(msg=cast(Any, []))
            case "chat_get_nickname":
                await send(username=await client.chat_get_nickname(int(username), uid))
            case "chat_change_nickname":
                await send(uid=int(await client.chat_change_nickname(cast(int, msg), uid, username)))
            case "push_get_vapid_public_key":
                await send(msg=vapid_public_key)
            case _:
                await websocket.close(1008)
                return
    except asyncio.CancelledError:
        pass

async def send_loop(websocket: Websocket, client: RpcExchangerClient, request: Request) -> None:
    task_list: set[asyncio.Task[None]] = set()
    try:
        async for json_msg in websocket:
            if json_msg is None:
                break
            #await rate_limit(ip)
            task_list.add(asyncio.create_task(handle_request(websocket, client, json_msg, request)))
    except Exception as e:
        logging.info(e, exc_info=True)
        await websocket.close(1008, ",".join(e.args))
    finally:
        for i in task_list:
            i.cancel()


@app.before_server_start
async def init_exchanger(*_):
    await app.ctx.exchanger.__aenter__()

@app.after_server_stop
async def destroy_exchanger(*_):
    await app.ctx.exchanger.__aexit__(None, None, None)

if os.getenv("WEBVCC_DISABLE_STATIC") is None:
    @app.exception(NotFound, IsADirectoryError)
    async def ignore_404s(request:Request,exception):
        print(request.path)
        if os.path.isfile(path:=static_base+ request.path):
            return await  file_stream(static_base+ request.path)
        else:
            return await  file_stream(static_base+ "/index.html")
@app.websocket("/ws")
async def loop(request: Request, websocket: Websocket) -> None:
    retry = False
    ip: str = request.ip if request.ip != "127.0.0.1" else request.headers.get("X-Real-IP","0.0.0.0")
    logging.info(f"{request.id} at {ip} has connected")
    while True:
        try:
            async with app.ctx.exchanger.create_client() as client:
                send_loop_task = asyncio.create_task(send_loop(websocket, client, request))
                recv_loop_task = asyncio.create_task(recv_loop(websocket, client))
                done, pending = await asyncio.wait([send_loop_task, recv_loop_task], return_when=asyncio.FIRST_COMPLETED)
                for task in pending:
                    task.cancel()
        except BrokenPipeError:
            if retry:
                await websocket.close(1001)
                return
            #await app.ctx.exchanger.__aexit__(None,None,None)
            await app.ctx.exchanger.__aenter__()
            retry = True
            continue
        break
    logging.info(f"{request.id} has disconnected")

app.config.WEBSOCKET_MAX_SIZE = 1 << 13

logging.getLogger("vcc.vcc").setLevel(logging.DEBUG)
logging.getLogger().setLevel(logging.DEBUG)
if __name__ == "__main__":
    app.run(os.environ.get("WEBVCC_ADDR", "0.0.0.0"), 2479, access_log=True)
