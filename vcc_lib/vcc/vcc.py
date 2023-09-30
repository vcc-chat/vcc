from __future__ import annotations

import asyncio
import redis.asyncio as redis
import socket
import logging
import json
import warnings
import uuid
import os

from functools import wraps
from redis.asyncio.client import PubSub
from redis.backoff import ExponentialBackoff
from redis.asyncio.retry import Retry
from redis.exceptions import ConnectionError, TimeoutError
from typing import (
    TYPE_CHECKING,
    Any,
    Awaitable,
    Callable,
    cast,
    Coroutine,
    Literal,
    overload,
    no_type_check_decorator,
)
from os import getenv

from .service import RpcServiceFactory,Transport
from .tools import *

if TYPE_CHECKING:

    async def service_table_getattr(**kwargs) -> Any:
        ...

    class ServiceTableTypeImpl:
        def __getattr__(self, key):
            return service_table_getattr

    class ServiceTableType:
        def __getattr__(self, key) -> ServiceTableTypeImpl:
            ...


class RpcExchanger:
    """Low-level api which is hard to use"""

    _redis: redis.Redis[bytes]
    recv_hook: Callable[[RedisMessage], None | Awaitable[None]] | None = None

    def __init__(
        self,
        *,
        rpc_host: str | None = None,
        rpc_port: int | None = None,
        redis_url: str | None = None,
    ) -> None:
        host_env = get_host()
        rpc_host = host_env[0] if rpc_host is None else rpc_host
        rpc_port = host_env[1] if rpc_port is None else rpc_port
        self._redis_url = (
            getenv("REDIS_URL", "redis://localhost:6379")
            if redis_url is None
            else redis_url
        )

        self._socket_address = (rpc_host, rpc_port)
        self._redis = redis.Redis.from_url(
            self._redis_url,
            retry=Retry(ExponentialBackoff(), 5),
            retry_on_error=[ConnectionError, TimeoutError],
            health_check_interval=15,
        )
        self._pubsub_raw: PubSub = self._redis.pubsub(ignore_subscribe_messages=True)
        self._rpc_factory = RpcServiceFactory()
        self.client_list: set[RpcExchangerBaseClient] = set()

    async def recv_task(self):
        raw_message: Any = None
        try:
            async for raw_message in self.pubsub.listen():
                if raw_message is None:
                    await asyncio.sleep(0.01)
                    continue
                log.debug(f"{raw_message['data']=} {raw_message['channel']=}")
                try:
                    json_content_untyped: Any = json.loads(raw_message["data"].decode())
                    if raw_message["channel"] == b"messages":
                        json_message: RedisMessage = json_content_untyped
                        if self.recv_hook is not None:
                            recv_hook_return = self.recv_hook(json_message)
                            if isinstance(recv_hook_return, Coroutine):
                                asyncio.create_task(recv_hook_return)
                        session: str | None = None
                        username = json_message["username"]
                        msg_type= json_message["msg_type"]
                        payload = json_message["payload"]
                        chat = int(json_message["chat"])
                        uid = int(json_message["uid"])
                        if "session" in json_message:
                            session = json_message["session"]
                        id = json_message["id"]
                        for client in self.client_list:
                            if chat in client._chat_list and (
                                session is None
                                or isinstance(client, RpcRobotExchangerClient)
                                or (chat, session) in client._session_list
                            ):
                                client._recv_future.set_result(("message",
                                json_message)
                                )
                        if "session" in json_message:
                            session = json_message["session"]
                        log.debug(f"{username=} {payload=} {chat=} {session=}")
                    elif raw_message["channel"] == b"events":
                        json_content: RedisEvent = json_content_untyped
                        type = json_content["type"]
                        data = json_content["data"]
                        chat = int(json_content["chat"])
                        for client in self.client_list:
                            if chat in client._chat_list:
                                client._recv_future.set_result(
                                    ("event", type, data, chat)
                                )
                except asyncio.CancelledError:
                    return
                except Exception as e:
                    log.debug(e, exc_info=True)
                    raw_message = None
                    await asyncio.sleep(0.01)
        except (redis.TimeoutError, redis.ConnectionError):
            self._redis = redis.Redis.from_url(
                self._redis_url,
                retry=Retry(ExponentialBackoff(), 5),
                retry_on_error=[ConnectionError, TimeoutError],
                health_check_interval=15,
            )
            self._pubsub_raw: PubSub = self._redis.pubsub(
                ignore_subscribe_messages=True
            )
            self.pubsub: PubSub = await self._pubsub_raw.__aenter__()
            await self.pubsub.subscribe("messages")
            await self.pubsub.subscribe("events")
            await self.recv_task()

    async def __aenter__(self) -> RpcExchanger:
        asyncio.create_task(self._rpc_factory.aconnect())

        self.pubsub: PubSub = await self._pubsub_raw.__aenter__()
        await self.pubsub.subscribe("messages")
        await self.pubsub.subscribe("events")

        self._recv_task = asyncio.create_task(self.recv_task())
        return self

    async def __aexit__(self, *args: Any) -> None:
        self._recv_task.cancel()
        await self.pubsub.unsubscribe("messages")
        await self.pubsub.unsubscribe("events")
        await self._pubsub_raw.__aexit__(*args)
        await self._redis.close()

    async def send_msg(
        self, uid: int, username: str, msg: str, chat: int, session: str | None = None
    ) -> str:
        return await self.send(uid,username,chat,msg,session=session)
    async def send(self,uid: int, username: str,chat:int,payload: Any,session: str|None=None,msg_type:str="msg"):
        log.debug(f"messages")
        id = str(uuid.uuid4())
        await self._redis.publish(
            f"messages",
            json.dumps(
                {
                    "id":id,
                    "uid": uid,
                    "username": username,
                    "payload": payload,
                    "msg_type": msg_type,
                    "chat": chat,
                    **({} if session is None else {"session": session}),
                }
            ),
        )
        log.debug(f"{username=} {chat=}")
        return id
    async def send_event(
        self, type: str, data: Any, chat: int, session: str | None = None
    ) -> None:
        log.debug(f"event")
        await self._redis.publish(
            f"events",
            json.dumps(
                {
                    "type": type,
                    "data": data,
                    "chat": chat,
                    **({} if session is None else {"session": session}),
                }
            ),
        )
        log.debug(f"{type=} {chat=}")

    async def rpc_request(
        self, namespace: str, service: str, data: dict[str, Any]
    ) -> Any:
        log.debug(f"{service=} {data=}")
        result = await cast(Transport, self._rpc_factory.superservice).call(
            namespace, service, data
        )
        log.debug(f"{result=}")
        return result

    def get_redis_instance(self) -> redis.Redis[bytes]:
        return self._redis

    def create_client(self) -> RpcExchangerClient:
        return RpcExchangerClient(self)

    def create_robot_client(self) -> RpcRobotExchangerClient:
        return RpcRobotExchangerClient(self)


class RpcExchangerBaseClient:
    _exchanger: RpcExchanger
    _chat_list: set[int]
    _session_list: set[tuple[int, str]]
    _id: int | None
    _name: str | None
    _pubsub: PubSub
    _recv_future: asyncio.Future
    _chat_list_inited: bool


    @property
    def id(self) -> int | None:
        return self._id

    @property
    def name(self) -> str | None:
        return self._name

    def __init__(self, exchanger: RpcExchanger) -> None:
        self._exchanger = exchanger
        self._chat_list = set()
        self._session_list = set()
        self._id = None
        self._name = None
        self._rpc: ServiceTableType = self._exchanger._rpc_factory.services  # type: ignore
        self._chat_list_lock = asyncio.Lock()
        self._pubsub = self._exchanger.pubsub
        self._exchanger.client_list.add(self)
        self._recv_future = asyncio.Future()
        self._chat_list_inited = False

    @check()
    @rpc_request("login/is_online")
    async def is_online(self, ids: list[int]) -> list[bool]:
        ...

    async def chat_list(self) -> list[tuple[int, str, int | None]]:
        ...

    def check_authorized(self) -> None:
        if self._id is None or self._name is None:
            raise NotAuthorizedError()

    async def check_joined(self, chat: int) -> None:
        if not self._chat_list_inited:
            await self.chat_list()
        if chat not in self._chat_list:
            raise ChatNotJoinedError()

    async def check_not_joined(self, chat: int) -> None:
        if not self._chat_list_inited:
            await self.chat_list()
        if chat in self._chat_list and self._chat_list_inited:
            raise ChatAlreadyJoinedError()

    @check(joined="chat")
    async def send_with_another_username(
        self, uid: int, username: str, msg: str, chat: int, session: str | None
    ) -> None:
        if session is not None and (chat, session) not in self._session_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.check_send_with_another_username(
            chat_id=chat, user_id=self._id
        ):
            raise PermissionDeniedError()
        await self._exchanger.send_msg(uid, username, msg, chat, session)

    async def recv(
        self,
    ) -> tuple[Literal["message"],dict] | tuple[
        Literal["event"], Event, Any, int
    ]:
        content = await self._recv_future
        if content[0] == "event":
            data = content[2]
            chat = content[3]
            match content[1]:
                case "join" if data["user_id"] == self._id:
                    self._chat_list.add(chat)
                case "quit" if data["user_id"] == self._id:
                    self._chat_list.discard(chat)
                case "kick" if data["kicked_user_id"] == self._id:
                    self._chat_list.discard(chat)
                case "invite" if data["invited_user_id"] == self._id:
                    self._chat_list.add(chat)
        self._recv_future = asyncio.Future()
        return content

    @check()
    @rpc_request()
    async def chat_get_name(self, id: int) -> str:
        """Get name of chat by id"""
        ...

    @check(joined="id", error_return=[])
    async def chat_get_users(self, id: int) -> list[tuple[int, str]]:
        """Get id of all users in the chat"""
        return cast(
            list[tuple[int, str]],
            [tuple(i) for i in await self._rpc.chat.get_users(id=id)],
        )

    @check(joined="chat_id", error_return={})
    @rpc_request()
    async def chat_get_user_permission(
        self, chat_id: int, user_id: int
    ) -> dict[ChatUserPermissionName, bool]:
        ...

    @check(joined="chat_id", error_return={})
    @rpc_request()
    async def chat_get_permission(self, chat_id: int) -> dict[ChatPermissionName, bool]:
        ...

    @check(joined="chat_id", error_return={})
    @rpc_request("chat/get_all_user_permission")
    async def chat_get_all_permission(
        self, chat_id: int
    ) -> dict[int, dict[ChatUserPermissionName, bool]]:
        ...

    @check(joined="id", error_return=[])
    @rpc_request()
    async def chat_list_sub_chats(self, id: int) -> list[tuple[int, str]]:
        """List all sub-chats of a chat"""
        ...

    @check()
    async def file_new_object(
        self, name: str, id: str | None = None, bucket: str = "file"
    ) -> tuple[str, str]:
        return cast(
            tuple[str, str],
            await self._rpc.file.new_object(
                name=name, id=str(uuid.uuid4()) if id is None else id, bucket=bucket
            ),
        )

    @check()
    @rpc_request()
    async def file_new_object_with_content(
        self, name: str, content: str, bucket: str = "file"
    ) -> str:
        ...

    @check()
    @rpc_request()
    async def file_get_object(self, id: str, bucket: str = "file") -> tuple[str, str]:
        ...

    @check()
    @rpc_request()
    async def file_get_object_content(
        self, id: str, bucket: str = "file"
    ) -> tuple[str, str]:
        ...

    def __aiter__(self) -> RpcExchangerBaseClient:
        return self

    async def __anext__(
        self,
    ) -> tuple[Literal["message"], dict] | tuple[
        Literal["event"], Event, Any, int
    ]:
        return await self.recv()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args: Any) -> None:
        self._exchanger.client_list.discard(self)
        return None


class RpcExchangerClient(RpcExchangerBaseClient):
    async def login(self, username: str, password: str) -> tuple[int, str] | None:
        if self._id is not None and self._name is not None:
            return
        login_result: tuple[int, str] | None = await self._rpc.login.login(
            username=username, password=password
        )
        if login_result is not None:
            uid, token = login_result
            self._id = uid
            self._name = username
            await self._rpc.login.add_online(id=uid)
            return uid, token
        return login_result

    async def token_login(self, token: str) -> tuple[int, str] | None:
        if self._id is not None and self._name is not None:
            return self._id, self._name
        uid, username = await self._rpc.login.token_login(token=token)
        if uid is not None:
            self._id = uid
            self._name = username
            await self._rpc.login.add_online(id=uid)
        else:
            return None
        return uid, username

    async def request_oauth(self, platform: str) -> tuple[str, str]:
        provider_name = "oauth_" + platform
        providers = await self._rpc.rpc.list_providers()
        if not provider_name in providers:
            raise ProviderNotFoundError()
        return cast(
            tuple[str, str], await getattr(self._rpc, provider_name).request_oauth()
        )

    async def login_oauth(self, platform: str, requestid: str):
        """
        Do this in a task! this will takes a long time
        """
        provider_name = "oauth_" + platform
        providers = await self._rpc.rpc.list_providers()
        if not provider_name in providers:
            raise ProviderNotFoundError()
        userinfo = await getattr(self._rpc, provider_name).login_oauth(
            requestid=requestid
        )
        uid, token = await self._rpc.login.post_oauth(
            platform=platform,
            metadata=userinfo["id"],
            nickname=userinfo.get("nickname"),
        )
        logging.debug(f"{uid=} {userinfo=}")
        self._id = uid
        self._name = await self._rpc.login.get_name(id=uid)
        return uid, token

    @check()
    async def add_online(self) -> None:
        await self._rpc.login.add_online(id=self._id)

    async def register(
        self, username: str, password: str, *, auto_login: bool = False
    ) -> bool:
        # Note: this only register, won't login
        success = await self._rpc.login.register(username=username, password=password)
        if success and auto_login:
            await self.login(username, password)
        return cast(bool, success)

    @check(joined="chat")
    async def send_msg(self, msg: str, chat: int, session: str | None) -> str:
        if session is not None and (chat, session) not in self._session_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.check_send(chat_id=chat, user_id=self._id):
            raise PermissionDeniedError()
        return await self._exchanger.send_msg(
            cast(int, self._id), cast(str, self._name), msg, chat, session
        )

    async def send(self,chat:int,payload,session: str|None=None,msg_type:str="msg"):
        if session is not None and (chat, session) not in self._session_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.check_send(chat_id=chat, user_id=self._id):
            raise PermissionDeniedError()
        return await self._exchanger.send(
            cast(int, self._id), cast(str, self._name),chat, payload, session
        )

    @check(joined="chat")
    async def send_typing_event(
        self, status: bool, chat: int, session: str | None
    ) -> None:
        self.check_authorized()
        await self.check_joined(chat)
        if session is not None and (chat, session) not in self._session_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.check_send(chat_id=chat, user_id=self._id):
            raise PermissionDeniedError()
        await self._exchanger.send_event(
            "typing", {"status": status, "uid": self.id}, chat, session
        )

    @check(joined="chat")
    async def send_with_another_username(
        self, uid: int, msg: str, chat: int, session: str | None
    ) -> str:
        if session is not None and (chat, session) not in self._session_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.check_send_with_another_username(
            chat_id=chat, user_id=self._id
        ):
            raise PermissionDeniedError()
        username = await self._rpc.chat.get_nickname(chat_id=chat, user_id=uid)
        return await self._exchanger.send_msg(uid, username, msg, chat, session)

    @check(joined="chat_id", error_return=False)
    async def session_join(self, name: str, chat_id: int) -> bool:
        result = await self._rpc.chat.check_create_session(
            chat_id=chat_id, user_id=self._id
        )
        if result:
            self._session_list.add((chat_id, name))
        return cast(bool, result)

    @check()
    async def chat_create(self, name: str, parent_chat_id: int = -1) -> int:
        """Create a new chat, user will join the chat created after creating"""
        if parent_chat_id != -1:
            await self.check_joined(parent_chat_id)
        return cast(
            int,
            await self._rpc.chat.create_with_user(
                name=name, user_id=self._id, parent_chat_id=parent_chat_id
            ),
        )

    @check(not_joined="id", error_return=False)
    async def chat_join(self, id: int) -> bool:
        """Join a chat by its id"""
        if not await self._rpc.chat.join(chat_id=id, user_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.add(id)
        return True

    @check(joined="id", error_return=False)
    async def chat_quit(self, id: int) -> bool:
        """Quit a chat by its id"""
        if not await self._rpc.chat.quit(chat_id=id, user_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.discard(id)
        return True

    @check()
    async def chat_list(self) -> list[tuple[int, str, int | None]]:
        """List all chat you joined"""
        result: list[tuple[int, str, int | None]] = [
            cast(Any, tuple(i))
            for i in await self._rpc.chat.list_somebody_joined(id=self._id)
        ]
        result_set = {i[0] for i in result}
        self._chat_list_inited = True
        async with self._chat_list_lock:
            self._chat_list = result_set
        return result

    @check(joined="chat_id", error_return=False)
    async def chat_kick(self, chat_id: int, kicked_user_id: int) -> bool:
        """List all chat you joined"""
        if self._id == kicked_user_id:
            return False
        return cast(
            bool,
            await self._rpc.chat.kick(
                chat_id=chat_id, user_id=self._id, kicked_user_id=kicked_user_id
            ),
        )

    @check(joined="chat_id", error_return=False)
    @rpc_request(id_arg="user_id")
    async def chat_rename(self, chat_id: int, new_name: str) -> bool:
        ...

    @check(not_joined="chat_id", error_return=False)
    @rpc_request(id_arg="invited_user_id")
    async def chat_invite(self, chat_id: int, user_id: int) -> bool:
        ...

    @check(joined="chat_id", error_return=False)
    @rpc_request(id_arg="user_id")
    async def chat_modify_user_permission(
        self,
        chat_id: int,
        modified_user_id: int,
        name: ChatUserPermissionName,
        value: bool,
    ) -> bool:
        ...

    @check(joined="chat_id", error_return=False)
    @rpc_request(id_arg="user_id")
    async def chat_modify_permission(
        self, chat_id: int, name: ChatPermissionName, value: bool
    ) -> bool:
        ...

    @check(joined="chat_id", error_return=False)
    @rpc_request(id_arg="user_id")
    async def chat_change_nickname(
        self, chat_id: int, changed_user_id: int, new_name: str
    ) -> bool:
        ...

    @check(joined="chat_id")
    @rpc_request()
    async def chat_get_nickname(self, chat_id: int, user_id: int) -> str:
        ...

    @check()
    @rpc_request("login/change_nickname", id_arg="id")
    async def change_nickname(self, nickname: str) -> None:
        ...

    @check()
    @rpc_request("login/get_nickname", id_arg="id")
    async def get_nickname(self) -> str:
        ...

    async def __aexit__(self, *args: Any) -> None:
        self._exchanger.client_list.discard(self)
        if self._id is not None:
            await self._rpc.login.add_offline(id=self._id)
        return None


class RpcRobotExchangerClient(RpcExchangerBaseClient):
    async def login(self, name: str, token: str) -> int | None:
        if self._id is not None and self._name is not None:
            return self._id
        uid: int | None = await self._rpc.bot.login(name=name, token=token)
        if uid is not None:
            self._id = uid
            self._name = name
        return uid

    async def register(self, name: str, token: str) -> int | None:
        # Note: this only register, won't login
        if self._id is not None and self._name is not None:
            return self._id
        uid: int | None = await self._rpc.bot.register(name=name, token=token)
        if uid is not None:
            self._id = uid
            self._name = name
        return uid

    @check(joined="chat")
    async def send(
        self, username: str, msg: str, chat: int, session: str | None
    ) -> str:
        if not await self._rpc.bot.check_send(chat_id=chat, bot_id=self._id):
            raise PermissionDeniedError()
        # -1 means system or robot
        return await self._exchanger.send_msg(
            -1, f"{username}[{cast(str, self.name)}]", msg, chat, session
        )

    @check(not_joined="id", error_return=False)
    async def chat_join(self, id: int) -> bool:
        """Join a chat by its id"""
        if not await self._rpc.bot.join(chat_id=id, bot_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.add(id)
        return True

    @check(joined="id", error_return=False)
    async def chat_quit(self, id: int) -> bool:
        """Quit a chat by its id"""
        if not await self._rpc.bot.quit(chat_id=id, bot_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.discard(id)
        return True

    @check()
    async def chat_list(self) -> list[tuple[int, str, int | None]]:
        """List all chat you joined"""
        result: list[tuple[int, str, int | None]] = [
            cast(Any, tuple(i)) for i in await self._rpc.bot.list_chat(id=self._id)
        ]
        result_set = {i[0] for i in result}
        self._chat_list_inited = True
        async with self._chat_list_lock:
            self._chat_list = result_set
        return result

    @check(joined="chat_id", error_return=False)
    @rpc_request("bot/kick", id_arg="bot_id")
    async def chat_kick(self, chat_id: int, kicked_user_id: int) -> bool:
        """List all chat you joined"""
        ...

    @check(joined="chat_id", error_return=False)
    @rpc_request("bot/rename", id_arg="bot_id")
    async def chat_rename(self, chat_id: int, new_name: str) -> bool:
        ...

    @check(joined="chat_id", error_return=False)
    @rpc_request("bot/modify_user_permission", id_arg="bot_id")
    async def chat_modify_user_permission(
        self,
        chat_id: int,
        modified_user_id: int,
        name: ChatUserPermissionName,
        value: bool,
    ) -> bool:
        ...

    @check(joined="chat_id", error_return=False)
    @rpc_request("bot/modify_permission", id_arg="bot_id")
    async def chat_modify_permission(
        self, chat_id: int, name: ChatPermissionName, value: bool
    ) -> bool:
        ...
def generate_msg(
        uid: int, username: str, msg: str, chat: int, session: str | None = None,id:str|None=None
    ) -> tuple[str,str]:
        id = id or str(uuid.uuid4())

        return id,json.dumps(
                {
                    "id":id,
                    "uid": uid,
                    "username": username,
                    "msg": msg,
                    "chat": chat,
                    **({} if session is None else {"session": session}),
                }
            ),


