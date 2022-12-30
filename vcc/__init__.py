from __future__ import annotations

import asyncio
import redis.asyncio as redis
import socket
import logging
import json
import warnings

from functools import wraps
from redis.asyncio.client import PubSub
from typing import Any, Awaitable, Callable, cast, TypedDict, Literal, overload, no_type_check_decorator

log = logging.getLogger(__name__)
log.addHandler(logging.NullHandler())

ChatUserPermissionName = Literal["kick", "rename", "invite", "modify_permission", "send"]
ChatPermissionName = Literal["public"]

class RpcException(Exception):
    pass

class ChatAlreadyJoinedError(RpcException):
    pass

class ChatNotJoinedError(RpcException):
    pass

class UnknownError(RpcException):
    pass

class NotAuthorizedError(RpcException):
    pass

class PermissionDeniedError(RpcException):
    pass

class RpcExchangerRpcHandler2:
    def __init__(self, exchanger: RpcExchanger,  provider: str) -> None:
        self._exchanger = exchanger
        self._provider = provider

    def __getattr__(self, service: str) -> Callable[..., Awaitable]:
        async def func(**data):
            log.debug(f"{self._provider=} {service=} {data=}")
            result = await self._exchanger.rpc_request(self._provider+"/"+service, data)
            log.debug(f"{result=}")
            return result
            
        return func

class RpcExchangerRpcHandler:
    def __init__(self, exchanger: RpcExchanger) -> None:
        self._exchanger = exchanger

    def __getattr__(self, provider: str):
        return RpcExchangerRpcHandler2(self._exchanger, provider)

class RedisMessage(TypedDict):
    username: str
    msg: str

Event = Literal["join", "quit", "kick", "rename", "invite"]

MessageCallback = Callable[[str, str, int], None | Awaitable[None]]
EventCallback = Callable[[Event, Any, int], None | Awaitable[None]]

class RedisEvent(TypedDict):
    type: Event
    data: Any

class RpcExchanger:
    """Low-level api which is hard to use"""
    _sock: socket.socket
    _redis: redis.Redis
    _jobid: str
    def __init__(self) -> None:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("0.0.0.0", 0))
        self._sock = sock
        self._lock = asyncio.Lock()

        self._redis = redis.Redis(host="localhost")
        self.rpc = RpcExchangerRpcHandler(self)

    def __enter__(self) -> RpcExchanger:
        # you should not use this, use async version instead
        sock = self._sock
        sock.connect(("127.0.0.1", 2474))
        sock.send(b'{"type": "handshake","role": "client"}')
        self._jobid = json.loads(sock.recv(65536).decode())["initial_jobid"]
        sock.setblocking(False)
        return self

    def __exit__(self, *args) -> None:
        # redis close
        self._sock.shutdown(socket.SHUT_RDWR)
        self._sock.close()

    async def __aenter__(self) -> RpcExchanger:
        loop = asyncio.get_event_loop()
        sock = self._sock
        sock.setblocking(False)
        await loop.sock_connect(sock, ("127.0.0.1", 2474))
        await loop.sock_sendall(sock, b'{"type": "handshake","role": "client"}')
        self._jobid = json.loads((await loop.sock_recv(sock, 65536)).decode())["initial_jobid"]
        return self

    async def __aexit__(self, *args) -> None:
        await self._redis.close()
        self._sock.shutdown(socket.SHUT_RDWR)
        self._sock.close()

    async def send_msg(self, username: str, msg: str, chat: int) -> None:
        log.debug(f"messages:{chat}")
        await self._redis.publish(f"messages:{chat}", json.dumps({
            "username": username,
            "msg": msg
        }))
        log.debug(f"{username=} {msg=} {chat=}")

    async def rpc_request(self, service: str, data: Any) -> Any:
        loop = asyncio.get_event_loop()
        async with self._lock:
            await loop.sock_sendall(self._sock, json.dumps({
                "type": "request",
                "service": service,
                "data": data,
                "jobid": self._jobid
            }).encode())
            decode_str = (await loop.sock_recv(self._sock, 67)).decode()
            self._jobid = json.loads(decode_str)["next_jobid"]
            decode_str = (await loop.sock_recv(self._sock, 65536)).decode()
            return json.loads(decode_str)["data"]

    def get_redis_instance(self) -> redis.Redis:
        return self._redis

    def create_client(self) -> RpcExchangerClient:
        return RpcExchangerClient(self)

class RpcExchangerClient:
    _exchanger: RpcExchanger
    _chat_list: set[int]
    _uid: int | None
    _username: str | None
    _pubsub_raw: PubSub
    _pubsub: PubSub
    _rpc: RpcExchangerRpcHandler

    _msg_callback: MessageCallback | None
    _event_callbacks: dict[Event, EventCallback]

    @property
    def uid(self) -> int | None:
        return self._uid

    @property
    def username(self) -> str | None:
        return self._username

    def __init__(self, exchanger: RpcExchanger) -> None:
        self._exchanger = exchanger
        self._chat_list = set()
        self._uid = None
        self._username = None
        self._pubsub_raw = self._exchanger.get_redis_instance().pubsub()
        self._rpc = self._exchanger.rpc
        self._chat_list_lock = asyncio.Lock()
        self._msg_callback = None
        self._event_callbacks = {}

    async def login(self, username: str, password: str) -> int | None:
        if self._uid is not None and self._username is not None:
            return self._uid
        uid: int | None = await self._rpc.login.login(username=username, password=password)
        if uid is not None:
            self._uid = uid
            self._username = username
        return uid

    async def register(self, username: str, password: str, *, auto_login: bool=False) -> bool:
        # Note: this only register, won't login
        success = await self._rpc.login.register(username=username, password=password)
        if success and auto_login:
            await self.login(username, password)
        return success

    def check_authorized(self) -> None:
        if self._uid is None or self._username is None:
            raise NotAuthorizedError()

    def check_joined(self, chat: int) -> None:
        if chat not in self._chat_list:
            raise ChatNotJoinedError()

    def check_not_joined(self, chat: int) -> None:
        if chat in self._chat_list:
            raise ChatAlreadyJoinedError()

    async def send(self, msg: str, chat: int) -> None:
        self.check_authorized()
        self.check_joined(chat)
        if self._username is None:
            raise NotAuthorizedError()
        if not await self._rpc.chat.check_send(chat_id=chat, user_id=self._uid):
            raise PermissionDeniedError()
        await self._exchanger.send_msg(self._username, msg, chat)    
    
    async def recv(self) -> tuple[Literal["message"], str, str, int] | tuple[Literal["event"], Event, Any, int]:
        raw_message: Any = None
        username = ""
        msg = ""
        chat = -1

        while True:
            while not self._chat_list:
                await asyncio.sleep(1)
            raw_message = await self._pubsub.get_message(ignore_subscribe_messages=True)
            if raw_message is None:
                await asyncio.sleep(0.01)
                continue
            log.debug(f"{raw_message['data']=} {raw_message['channel']=}")
            try:
                json_content_untyped: Any = json.loads(raw_message["data"].decode())
                if raw_message["channel"].startswith("messages"):
                    json_message: RedisMessage = json_content_untyped
                    username = json_message["username"]
                    msg = json_message["msg"]
                    chat = int(raw_message["channel"][9:])
                    log.debug(f"{username=} {msg=} {chat=}")
                    return "message", username, msg, chat
                elif raw_message["channel"].startswith("events"):
                    json_content: RedisEvent = json_content_untyped
                    type = json_content["type"]
                    data = json_content["data"]
                    chat = int(raw_message["channel"][7:])
                    match type:
                        case "join" if data["user_id"] == self._uid:
                            self._chat_list.add(chat)
                        case "quit" if data["user_id"] == self._uid:
                            self._chat_list.discard(chat)
                        case "kick" if data["kicked_user_id"] == self._uid:
                            self._chat_list.discard(chat)
                        case "invite" if data["invited_user_id"] == self._uid:
                            self._chat_list.add(chat)
                    return "event", type, data, chat
            except Exception as e:
                log.debug(e, exc_info=True)
                raw_message = None
                await asyncio.sleep(0.01)

    async def chat_create(self, name: str) -> int:
        self.check_authorized()
        return await self._rpc.chat.create_with_user(name=name, user_id=self._uid)
    
    async def chat_create2(self, name: str) -> int:
        return await self.chat_create(name)

    async def chat_get_name(self, id: int) -> str:
        self.check_authorized()
        return await self._rpc.chat.get_name(id=id)

    async def chat_get_users(self, id: int) -> list[int]:
        self.check_authorized()
        return await self._rpc.chat.get_users(id=id)

    async def chat_join(self, id: int, *, auto_subscribe: bool=True) -> bool:
        self.check_authorized()
        self.check_not_joined(id)
        if not await self._rpc.chat.join(chat_id=id, user_id=self._uid):
            return False
        if auto_subscribe:
            await self._pubsub.subscribe(f"messages:{id}")
            await self._pubsub.subscribe(f"events:{id}")
        async with self._chat_list_lock:
            self._chat_list.add(id)
        return True
    
    async def chat_quit(self, id: int, *, auto_subscribe: bool=True) -> bool:
        self.check_authorized()
        self.check_joined(id)
        if not await self._rpc.chat.quit(chat_id=id, user_id=self._uid):
            return False
        if auto_subscribe:
            await self._pubsub.unsubscribe(f"messages:{id}")
            await self._pubsub.unsubscribe(f"events:{id}")
        async with self._chat_list_lock:
            self._chat_list.remove(id)
        return True

    async def chat_list_somebody_joined(self) -> list[tuple[int, str]]:
        warnings.warn(DeprecationWarning("This method is deprecated, use chat_list instead"))
        return await self.chat_list()

    async def chat_list(self, *, auto_subscribe: bool=True) -> list[tuple[int, str]]:
        self.check_authorized()
        result: list[tuple[int, str]] = [
            cast(Any, tuple(i)) for i in await self._rpc.chat.list_somebody_joined(id=self._uid)
        ]
        result_set = {i[0] for i in result}
        async with self._chat_list_lock:
            if auto_subscribe:
                for i in self._chat_list - result_set:
                    # Chats quit or kicked
                    await self._pubsub.unsubscribe(f"messages:{i}")
                    await self._pubsub.unsubscribe(f"events:{i}")
                for i in result_set - self._chat_list:
                    # Chats joined
                    await self._pubsub.subscribe(f"messages:{i}")
                    await self._pubsub.subscribe(f"events:{i}")
            self._chat_list = result_set
        return result

    async def chat_kick(self, chat_id: int, kicked_user_id: int) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        if self._uid == kicked_user_id:
            return False
        return await self._rpc.chat.kick(chat_id=chat_id, user_id=self._uid, kicked_user_id=kicked_user_id)

    async def chat_rename(self, chat_id: int, new_name: str) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        return await self._rpc.chat.rename(chat_id=chat_id, user_id=self._uid, new_name=new_name)

    async def chat_invite(self, chat_id: int, user_id: int) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        return await self._rpc.chat.invite(chat_id=chat_id, user_id=user_id, invited_user_id=self._uid)

    async def chat_modify_user_permission(self, chat_id: int, modified_user_id: int, name: ChatUserPermissionName, value: bool) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        return await self._rpc.chat.modify_user_permission(chat_id=chat_id, user_id=self._uid, modified_user_id=modified_user_id, name=name, value=value)

    async def chat_get_user_permission(self, chat_id: int, user_id: int) -> dict[ChatUserPermissionName, bool]:
        self.check_authorized()
        self.check_joined(chat_id)
        return await self._rpc.chat.get_user_permission(chat_id=chat_id, user_id=user_id)

    async def chat_modify_permission(self, chat_id: int, name: str, value: bool) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        return await self._rpc.chat.modify_permission(chat_id=chat_id, user_id=self._uid, name=name, value=value)

    async def chat_get_permission(self, chat_id: int) -> dict[ChatPermissionName, bool]:
        self.check_authorized()
        self.check_joined(chat_id)
        return await self._rpc.chat.get_permission(chat_id=chat_id)

    async def chat_get_all_permission(self, chat_id: int) -> dict[int, dict[ChatUserPermissionName, bool]]:
        self.check_authorized()
        self.check_joined(chat_id)
        return await self._rpc.chat.get_all_user_permission(chat_id=chat_id)

    def __aiter__(self) -> RpcExchangerClient:
        return self

    async def __anext__(self) -> tuple[Literal["message"], str, str, int] | tuple[Literal["event"], Event, Any, int]:
        return await self.recv()

    async def __aenter__(self) -> RpcExchangerClient:
        self._pubsub = await self._pubsub_raw.__aenter__()
        return self

    async def __aexit__(self, *args) -> None:
        await self._pubsub_raw.__aexit__(None, None, None)
        return None

    @overload
    def on(self, type: Literal["message"]) -> Callable[[MessageCallback], MessageCallback]: ...

    @overload
    def on(self, type: Literal["event"], event_type: Event) -> Callable[[EventCallback], EventCallback]: ...

    @no_type_check_decorator
    def on(self, type, event_type = None):
        if type == "message" and event_type is None:
            def message_callback_handler(callback: MessageCallback) -> MessageCallback:
                self._msg_callback = callback
                return callback
            return message_callback_handler
        elif type == "event" and event_type is not None:
            def event_callback_handler(callback: EventCallback) -> EventCallback:
                self._event_callbacks[event_type] = callback
                return callback
            return event_callback_handler
        else:
            raise TypeError("Wrong usage")

    async def run_forever(self):
        async for result in self:
            if result[0] == "message":
                _, username, msg, chat = result
                if self._msg_callback is not None:
                    returned = self._msg_callback(username, msg, chat)
                    if isinstance(returned, Awaitable):
                        await returned
            else:
                _, type, data, chat = result
                if type in self._event_callbacks:
                    returned = self._event_callbacks[type](type, data, chat)
                    if isinstance(returned, Awaitable):
                        await returned

__all__ = [
    "RpcExchanger", 
    "RpcExchangerClient", 
    "ChatAlreadyJoinedError", 
    "ChatNotJoinedError", 
    "UnknownError", 
    "NotAuthorizedError", 
    "PermissionDeniedError", 
    "Event"
]
