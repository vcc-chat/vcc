from __future__ import annotations

from datetime import datetime, timedelta, timezone
import functools
from uuid import uuid4
from vcc import (
    PermissionDeniedError,
    RpcExchangerClient,
    ChatUserPermissionName,
    ChatPermissionName,
)
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


def notification(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        asyncio.create_task(func(*args, **kwargs))

    return wrapper


class Methods:
    def __init__(self, client: RpcExchangerClient):
        self._client = client

    async def login(self, username, password):
        client = self._client
        login_result = await client.login(username, password)
        if login_result is not None:
            token = login_result[1]
        else:
            token = None
        return {"success": login_result is not None, "token": token}

    async def token_login(self, token):
        client = self._client
        login_result = await client.token_login(token)
        if login_result is not None:
            new_username: str = login_result[1]
            return {"success": True, "username": new_username}
        # Since rpc hasn't implemented api of oauth's token, we try web-vcc's own token
        try:
            result = jwt.decode(token, key, ["HS512"])
            client._id = result["uid"]
            client._name = result["username"]
            await client.add_online()
            return {"success": True, "username": result["username"]}
        except (jwt.DecodeError, KeyError):
            return {"success": False, "username": ""}

    async def request_oauth(self, platform):
        client = self._client
        url, request_id = await client.request_oauth(platform)
        return {"request_id": request_id, "url": url}

    async def login_oauth(self, platform, request_id):
        client = self._client
        login_result = await client.login_oauth(platform, request_id)
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
            "username": client.name,
            "token": token,
        }

    async def is_online(self, users):
        client = self._client
        return await client.is_online(users)

    async def register(self, username, password):
        client = self._client
        return await client.register(username, password)

    @notification
    async def message(self, uid, msg, **kwargs):
        client = self._client
        try:
            await client.send(
                msg, uid, kwargs["session"] if "session" in kwargs else None
            )
        except PermissionDeniedError:
            pass  # FIXME: feedback to frontend

    async def session_join(self, name: str, parent: int):
        client = self._client
        return await client.session_join(name, parent)

    async def chat_create(self, name: str, parent: int | None) -> int:
        client = self._client
        return await client.chat_create(
            name, -1 if parent == 0 or parent is None else parent
        )

    async def chat_join(self, chat: int) -> bool:
        client = self._client
        return await client.chat_join(chat)

    async def chat_quit(self, chat: int):
        client = self._client
        return await client.chat_quit(chat)

    async def chat_get_name(self, chat: int):
        client = self._client
        return await client.chat_get_name(chat)

    async def chat_list(self):
        client = self._client
        return await client.chat_list()

    async def chat_get_users(self, chat: int):
        client = self._client
        return await client.chat_get_users(chat)

    async def chat_rename(self, chat: int, name: str):
        client = self._client
        return await client.chat_rename(chat, name)

    async def chat_kick(self, chat: int, user: int):
        return await self._client.chat_kick(chat, user)

    async def chat_modify_user_permission(
        self,
        chat_id: int,
        modified_user_id: int,
        name: ChatUserPermissionName,
        value: bool,
    ):
        client = self._client
        return await client.chat_modify_user_permission(
            chat_id,
            modified_user_id,
            name,
            value,
        )

    async def chat_get_all_permission(self, chat: int):
        client = self._client
        return await client.chat_get_all_permission(chat)

    async def chat_get_permission(self, chat: int):
        client = self._client
        return await client.chat_get_permission(chat)

    async def chat_modify_permission(
        self, chat: int, name: ChatPermissionName, value: bool
    ):
        client = self._client
        return await client.chat_modify_permission(chat, name, value)

    async def chat_generate_invite(self, chat: int):
        client = self._client
        if chat not in client._chat_list:
            raise PermissionDeniedError()
        return jwt.encode(
            {
                "": [chat, client.id],
                "exp": datetime.now(tz=timezone.utc) + timedelta(days=14),
            },
            key,
            "HS256",
        )

    async def chat_check_invite(self, token: str):
        try:
            result = jwt.decode(token, key, ["HS256"])
            return {"inviter": result[""][1], "chat": result[""][0]}
        except (jwt.DecodeError, KeyError):
            return {"inviter": None, "chat": None}

    async def chat_invite(self, token: str):
        client = self._client
        try:
            result = jwt.decode(token, key, ["HS256"])
            return await client.chat_invite(
                chat_id=result[""][0], user_id=result[""][1]
            )

        except (jwt.DecodeError, KeyError):
            return False

    async def file_upload(self, name: str):
        client = self._client
        url, id = await client.file_new_object(name)
        return {"id": id, "url": url}

    async def file_download(self, id: str):
        client = self._client
        url, name = await client.file_get_object(id)
        return {"name": name, "url": url}

    async def record_query(self, **kwargs):
        # client.check_authorized()
        # client.check_joined(uid)
        # result = await client._exchanger.rpc.record.query_record(chatid=uid, time=int(msg))
        # return {"record_query", "msg": result)
        # FIXME: Temporily disable support for chat record
        return {"msg": ([])}

    async def chat_get_nickname(self, chat: int, user: int):
        client = self._client
        return await client.chat_get_nickname(chat, user)

    async def chat_change_nickname(self, chat: int, user: int, name: str):
        client = self._client
        return await client.chat_change_nickname(chat, user, name)

    async def push_get_vapid_public_key(self):
        return application_server_key

    async def push_register(self, subscription):
        client = self._client
        if client.id is None:
            raise CloseException(1008)
        push_register(client.id, subscription)
        return {}
