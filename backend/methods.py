from datetime import datetime, timedelta, timezone
import functools
from typing import Any, Never, NotRequired, TypedDict
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

    class LoginReturnType(TypedDict):
        success: bool
        token: str | None
        username: str

    async def login(self, username: str, password: str) -> LoginReturnType:
        login_result = await self._client.login(username, password)
        if login_result is not None:
            token = login_result[1]
        else:
            token = None
        return {
            "success": login_result is not None,
            "token": token,
            "username": username,
        }

    class TokenLoginReturnType(TypedDict):
        success: bool
        username: str

    async def token_login(self, token: str) -> TokenLoginReturnType:
        login_result = await self._client.token_login(token)
        if login_result is not None:
            new_username: str = login_result[1]
            return {"success": True, "username": new_username}
        # Since rpc hasn't implemented api of oauth's token, we try web-vcc's own token
        try:
            result = jwt.decode(token, key, ["HS512"])
            self._client._id = result["uid"]
            self._client._name = result["username"]
            await self._client.add_online()
            return {"success": True, "username": result["username"]}
        except (jwt.DecodeError, KeyError):
            return {"success": False, "username": ""}

    class RequestOauthReturnType(TypedDict):
        request_id: str
        url: str

    async def request_oauth(self, platform: str) -> RequestOauthReturnType:
        url, request_id = await self._client.request_oauth(platform)
        return {"request_id": request_id, "url": url}

    class LoginOauthReturnType(TypedDict):
        username: str | None
        token: str

    async def login_oauth(self, platform: str, request_id: str) -> LoginOauthReturnType:
        uid, token = await self._client.login_oauth(platform, request_id)
        return {
            "username": self._client.name,
            "token": token,
        }

    async def is_online(self, users: list[int]) -> list[bool]:
        return await self._client.is_online(users)

    async def register(self, username: str, password: str) -> bool:
        return await self._client.register(username, password)

    class MessageKwargsType(TypedDict):
        session: NotRequired[str]

    async def message(self, chat: int, payload,msg_type: str="mge", session: str | None=None,) -> str | None:
        try:
            return await self._client.send( chat, payload,session,msg_type)
        except PermissionDeniedError:
            return None

    async def session_join(self, name: str, parent: int) -> bool:
        return await self._client.session_join(name, parent)

    async def chat_create(self, name: str, parent: int | None) -> int:
        return await self._client.chat_create(
            name, -1 if parent == 0 or parent is None else parent
        )

    async def chat_join(self, chat: int) -> bool:
        return await self._client.chat_join(chat)

    async def chat_quit(self, chat: int) -> bool:
        return await self._client.chat_quit(chat)

    async def chat_get_name(self, chat: int) -> str:
        return await self._client.chat_get_name(chat)

    async def chat_list(self) -> list[tuple[int, str, int | None]]:
        return await self._client.chat_list()

    async def chat_get_users(self, chat: int) -> list[tuple[int, str]]:
        return await self._client.chat_get_users(chat)

    async def chat_rename(self, chat: int, name: str) -> bool:
        return await self._client.chat_rename(chat, name)

    async def chat_kick(self, chat: int, user: int) -> bool:
        return await self._client.chat_kick(chat, user)

    async def chat_modify_user_permission(
        self,
        chat_id: int,
        modified_user_id: int,
        name: ChatUserPermissionName,
        value: bool,
    ) -> bool:
        return await self._client.chat_modify_user_permission(
            chat_id,
            modified_user_id,
            name,
            value,
        )

    async def chat_get_all_permission(
        self, chat: int
    ) -> dict[int, dict[ChatUserPermissionName, bool]]:
        return await self._client.chat_get_all_permission(chat)

    async def chat_get_permission(self, chat: int) -> dict[ChatPermissionName, bool]:
        return await self._client.chat_get_permission(chat)

    async def chat_modify_permission(
        self, chat: int, name: ChatPermissionName, value: bool
    ) -> bool:
        return await self._client.chat_modify_permission(chat, name, value)

    async def chat_generate_invite(self, chat: int) -> str:
        if chat not in self._client._chat_list:
            raise PermissionDeniedError()
        return jwt.encode(
            {
                "": [chat, self._client.id],
                "exp": datetime.now(tz=timezone.utc) + timedelta(days=14),
            },
            key,
            "HS256",
        )

    class ChatCheckReturnType(TypedDict):
        inviter: int | None
        chat: int | None

    async def chat_check_invite(self, token: str) -> ChatCheckReturnType:
        try:
            result = jwt.decode(token, key, ["HS256"])
            return {"inviter": result[""][1], "chat": result[""][0]}
        except (jwt.DecodeError, KeyError):
            return {"inviter": None, "chat": None}

    async def chat_invite(self, token: str) -> bool:
        try:
            result = jwt.decode(token, key, ["HS256"])
            return await self._client.chat_invite(
                chat_id=result[""][0], user_id=result[""][1]
            )

        except (jwt.DecodeError, KeyError):
            return False

    class FileUploadReturnType(TypedDict):
        id: str
        url: str

    async def file_upload(self, name: str) -> FileUploadReturnType:
        url, id = await self._client.file_new_object(name)
        return {"id": id, "url": url}

    class FileDownloadReturnType(TypedDict):
        url: str
        name: str

    async def file_download(self, id: str) -> FileDownloadReturnType:
        url, name = await self._client.file_get_object(id)
        return {"name": name, "url": url}

    class RecordQueryReturnType(TypedDict):
        msg: list[Never]

    async def record_query(self) -> RecordQueryReturnType:
        # self._client.check_authorized()
        # self._client.check_joined(uid)
        # result = await self._client._exchanger.rpc.record.query_record(chatid=uid, time=int(msg))
        # return {"record_query", "msg": result)
        # FIXME: Temporily disable support for chat record
        return {"msg": []}

    async def chat_get_nickname(self, chat: int, user: int) -> str:
        return await self._client.chat_get_nickname(chat, user)

    async def chat_change_nickname(self, chat: int, user: int, name: str) -> bool:
        return await self._client.chat_change_nickname(chat, user, name)

    async def push_get_vapid_public_key(self) -> str:
        return application_server_key

    async def push_register(self, subscription: Any) -> None:
        if self._client.id is None:
            raise CloseException(1008)
        push_register(self._client.id, subscription)
