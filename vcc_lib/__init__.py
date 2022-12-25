from __future__ import annotations

import asyncio
import redis.asyncio as redis
import socket
import logging
import json
from typing import Any, Awaitable, Callable

log = logging.getLogger(__name__)
log.addHandler(logging.NullHandler())

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

class RpcExchangerRpcHandler:
    def __init__(self, exchanger: RpcExchanger) -> None:
        self._exchanger = exchanger

    def __getattr__(self, service: str) -> Callable[..., Awaitable[Any]]:
        async def func(**data):
            return await self._exchanger.rpc_request(service, data)
        return func

class RpcExchanger:
    """Low-level api which is hard to use"""
    _sock: socket.socket
    _redis: redis.Redis
    _pubsub_raw: Any
    _pubsub: Any
    _jobid: str
    def __init__(self) -> None:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setblocking(False)
        sock.bind(("0.0.0.0", 0))
        self._sock = sock
        self._lock = asyncio.Lock()

        self._redis = redis.Redis(host="localhost")
        self.rpc = RpcExchangerRpcHandler(self)

    async def __aenter__(self) -> RpcExchanger:
        loop = asyncio.get_event_loop()
        sock = self._sock
        await loop.sock_connect(sock, ("127.0.0.1", 2474))
        await loop.sock_sendall(sock, b'{"type": "handshake","role": "client"}')
        self._jobid = json.loads((await loop.sock_recv(sock, 65536)).decode())["initial_jobid"]
        return self

    async def __aexit__(self, *args) -> None:
        await self._redis.close()
        self._sock.shutdown(socket.SHUT_RDWR)
        self._sock.close()

    async def send_msg(self, username: str, msg: str, chat: int) -> None:
        await self._redis.publish(f"messages:{chat}", json.dumps({
            "username": username,
            "msg": msg
        }))

    async def rpc_request(self, service: str, data: Any) -> Any:
        loop = asyncio.get_event_loop()
        async with self._lock:
            await loop.sock_sendall(self._sock, json.dumps({
                "type": "request",
                "service": service,
                "data": data,
                "jobid": self._jobid
            }).encode())
            self._jobid = json.loads((await loop.sock_recv(self._sock, 65536)).decode())["next_jobid"]
            return json.loads((await loop.sock_recv(self._sock, 65536)).decode())["data"]

    def get_redis_instance(self) -> redis.Redis:
        return self._redis

    def create_client(self) -> RpcExchangerClient:
        return RpcExchangerClient(self)

class RpcExchangerClient:
    _exchanger: RpcExchanger
    _chat_list: set[int]
    _uid: int | None
    _username: str | None
    _pubsub_raw: Any
    _pubsub: Any
    _rpc: RpcExchangerRpcHandler

    def __init__(self, exchanger: RpcExchanger) -> None:
        self._exchanger = exchanger
        self._chat_list = set()
        self._uid = None
        self._username = None
        self._pubsub_raw = self._exchanger.get_redis_instance().pubsub()
        self._rpc = self._exchanger.rpc

    async def login(self, username: str, password: str) -> int | None:
        uid: int | None = await self._rpc.login(username=username, password=password)
        log.debug(f"{uid=}")
        if uid is not None:
            self._uid = uid
            self._username = username
        return uid

    def check_authorized(self) -> None:
        if self._uid is None or self._username is None:
            raise NotAuthorizedError()

    async def send(self, msg: str, chat: int) -> None:
        self.check_authorized()
        if chat not in self._chat_list:
            raise ChatNotJoinedError()
        if self._username is None:
            raise NotAuthorizedError()
        await self._exchanger.send_msg(self._username, msg, chat)    
    
    async def recv(self, ignore_self_messages: bool=False) -> tuple[str, str, int]:
        raw_message: Any = None
        username = ""
        msg = ""
        chat = -1
        while raw_message is None:
            raw_message = await self._pubsub.get_message(ignore_subscribe_messages=True)
            try:
                json_content = json.loads(raw_message["data"].decode())
                username = json_content["username"]
                msg = json_content["msg"]
                chat = int(raw_message["channel"][9:])
                if ignore_self_messages and username == self._username:
                    raw_message = None
            except:
                raw_message = None
        return username, msg, chat

    async def chat_create(self, name: str) -> int:
        self.check_authorized()
        return await self._rpc.chat_create(name=name)

    async def chat_get_name(self, id: int) -> list[int]:
        self.check_authorized()
        return await self._rpc.chat_get_name(id=id)

    async def chat_get_users(self, id: int) -> list[int]:
        self.check_authorized()
        return await self._rpc.chat_get_users(id=id)

    async def chat_join(self, id: int) -> None:
        self.check_authorized()
        if id in self._chat_list:
            raise ChatAlreadyJoinedError()
        if not await self._rpc.chat_join(chat_id=id, user_id=self._uid):
            raise UnknownError()
        self._pubsub.subscribe(f"messages:{id}")
        self._chat_list.add(id)
    
    async def chat_quit(self, id: int) -> None:
        self.check_authorized()
        if id not in self._chat_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat_quit(chat_id=id, user_id=self._uid):
            raise UnknownError()
        self._pubsub.unsubscribe(f"messages:{id}")
        self._chat_list.remove(id)

    async def __aenter__(self) -> RpcExchangerClient:
        self._pubsub = await self._pubsub_raw.__aenter__()
        return self

    async def __aexit__(self, *args) -> None:
        await self._pubsub_raw.__aexit__(None, None, None)
        for i in self._chat_list:
            await self.chat_quit(i)
        return None


__all__ = ["RpcExchanger", "RpcExchangerClient", "ChatAlreadyJoinedError", "ChatNotJoinedError", "UnknownError", "NotAuthorizedError"]
