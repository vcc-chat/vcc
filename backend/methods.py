from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4
from vcc import PermissionDeniedError, RpcExchangerClient
from webpush import *

import jwt
import os
import json
import sys

confpath = os.getenv(
    "WEBVCC_CONFPATH", "config.json"
)  # FIXME: I dont think a file just for key is a good idea
static_base = os.path.dirname(sys.argv[0]) + "/static"
print(static_base)
if not os.path.exists(confpath):
    json.dump({"key": str(uuid4())}, open(confpath, "w"))
with open(confpath) as config_file:
    config = json.load(config_file)
    key = config["key"]


class CloseException(Exception):
    pass


class Methods:
    def __init__(self, client: RpcExchangerClient):
        self._client = client

    async def login(self, usrname, uid, msg, **kwargs):
        client = self._client
        login_result = await client.login(usrname, msg)
        if login_result is not None:
            token = login_result[1]
        else:
            token = ""
        return {"uid": None if login_result is None else login_result[0], "msg": token}

    async def token_login(self, usrname, uid, msg, **kwargs):
        client = self._client
        login_result = await client.token_login(msg)
        if login_result is not None:
            new_username: str = login_result[1]
            new_uid: int = login_result[0]
            return {"uid": new_uid, "usrname": new_username}
        # Since rpc hasn't implemented api of oauth's token, we try web-vcc's own token
        try:
            result = jwt.decode(msg, key, ["HS512"])
            client._id = result["uid"]
            client._name = result["username"]
            await client.add_online()
            return {"uid": result["uid"], "usrname": result["username"]}
        except (jwt.DecodeError, KeyError):
            return {"uid": None, "usrname": ""}

    async def request_oauth(self, usrname, uid, msg, **kwargs):
        client = self._client
        url, request_id = await client.request_oauth(msg)
        return {"usrname": request_id, "msg": url}

    async def login_oauth(self, usrname, uid, msg, **kwargs):
        client = self._client
        login_result = await client.login_oauth(usrname, msg)
        if login_result is not None:
            # await client.chat_list()
            token = jwt.encode(
                {
                    "username": client.name,
                    "uid": login_result,
                    "exp": datetime.now(tz=timezone.utc) + timedelta(days=14),
                },
                key,
                "HS512",
            )
        else:
            token = ""
        return {
            "uid": (None if login_result is None else int(login_result[0])),
            "usrname": client.name,
            "msg": token,
        }

    async def is_online(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"msg": (await client.is_online(msg))}

    async def register(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"uid": int(await client.register(usrname, msg))}

    async def message(self, usrname, uid, msg, session, **kwargs):
        client = self._client
        try:
            await client.send(
                msg, uid, kwargs["session"] if "session" in kwargs else None
            )
        except PermissionDeniedError:
            pass  # FIXME: feedback to frontend

    async def session_join(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"uid": await client.session_join(msg, uid)}

    async def chat_create(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {
            "uid": await client.chat_create(
                usrname, -1 if uid == 0 or uid is None else uid
            )
        }

    async def chat_join(self, usrname, uid, msg, **kwargs):
        client = self._client
        # also return session name
        join_successfully = await client.chat_join(uid)
        if not join_successfully:
            return {"uid": 0}
        else:
            return {"uid": 1, "usrname": await client.chat_get_name(uid)}

    async def chat_quit(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"uid": int(await client.chat_quit(uid))}

    async def chat_get_name(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"usrname": await client.chat_get_name(uid)}

    async def chat_list(self, usrname, uid, msg, **kwargs):
        client = self._client
        value = await client.chat_list()
        return {"msg": value}

    async def chat_get_users(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"msg": await client.chat_get_users(uid)}

    async def chat_rename(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"uid": int(await client.chat_rename(uid, msg))}

    async def chat_kick(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"uid": int(await client.chat_kick(uid, int(msg)))}

    async def chat_modify_user_permission(self, usrname, uid, msg, **kwargs):
        client = self._client
        data = msg
        return {
            "uid": int(
                await client.chat_modify_user_permission(
                    data["chat_id"],
                    data["modified_user_id"],
                    data["name"],
                    data["value"],
                )
            )
        }

    async def chat_get_all_permission(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"msg": await client.chat_get_all_permission(uid)}

    async def chat_get_permission(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"msg": await client.chat_get_permission(uid)}

    async def chat_modify_permission(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {
            "uid": int(await client.chat_modify_permission(uid, usrname, bool(msg)))
        }

    async def chat_generate_invite(self, usrname, uid, msg, **kwargs):
        client = self._client
        if uid not in client._chat_list:
            raise PermissionDeniedError()
        token = jwt.encode(
            {
                "": [uid, client.id],
                "exp": datetime.now(tz=timezone.utc) + timedelta(days=14),
            },
            key,
            "HS256",
        )
        return {"msg": token}

    async def chat_check_invite(self, usrname, uid, msg, **kwargs):
        client = self._client
        try:
            result = jwt.decode(msg, key, ["HS256"])
            return {"uid": result[""][1], "msg": result[""][0]}
        except (jwt.DecodeError, KeyError):
            return {"uid": None}

    async def chat_invite(self, usrname, uid, msg, **kwargs):
        client = self._client
        try:
            result = jwt.decode(msg, key, ["HS256"])
            return {
                "uid": int(
                    await client.chat_invite(
                        chat_id=result[""][0], user_id=result[""][1]
                    )
                )
            }
        except (jwt.DecodeError, KeyError):
            return {"uid": None}

    async def file_upload(self, usrname, uid, msg, **kwargs):
        client = self._client
        url, id = await client.file_new_object(msg)
        return {"usrname": id, "msg": url}

    async def file_download(self, usrname, uid, msg, **kwargs):
        client = self._client
        url, name = await client.file_get_object(msg)
        return {"usrname": name, "msg": url}

    async def record_query(self, usrname, uid, msg, **kwargs):
        client = self._client
        # client.check_authorized()
        # client.check_joined(uid)
        # result = await client._exchanger.rpc.record.query_record(chatid=uid, time=int(msg))
        # return {"record_query", "msg": result)
        # FIXME: Temporily disable support for chat record
        return {"msg": ([])}

    async def chat_get_nickname(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"usrname": await client.chat_get_nickname(int(usrname), uid)}

    async def chat_change_nickname(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"uid": int(await client.chat_change_nickname(msg, uid, usrname))}

    async def push_get_vapid_public_key(self, usrname, uid, msg, **kwargs):
        client = self._client
        return {"msg": application_server_key}

    async def push_register(self, usrname, uid, msg, **kwargs):
        client = self._client
        if client.id is None:
            raise CloseException(1008)
            return
        push_register(client.id, msg)
        return {}
