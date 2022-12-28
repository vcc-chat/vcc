from __future__ import annotations

import asyncio
import redis.asyncio as redis
import socket
import logging
import json
import warnings
from typing import Any, Awaitable, Callable, cast

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

class RpcExchangerRpcHandler2:
    def __init__(self, exchanger: RpcExchanger,  provider: str) -> None:
        self._exchanger = exchanger
        self._provider = provider

    def __getattr__(self, service: str):
        async def func(**data):
            result = await self._exchanger.rpc_request(self._provider+"/"+service, data)
            log.debug(f"{result=}")
            return result
            
        return func

class RpcExchangerRpcHandler:
    def __init__(self, exchanger: RpcExchanger) -> None:
        self._exchanger = exchanger

    def __getattr__(self, provider: str):
        return RpcExchangerRpcHandler2(self._exchanger, provider)

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
            log.debug(f"{service=} {data=}")
            decode_str = (await loop.sock_recv(self._sock, 67)).decode()
            log.debug(f"{decode_str=}")
            self._jobid = json.loads(decode_str)["next_jobid"]
            decode_str = (await loop.sock_recv(self._sock, 65536)).decode()
            log.debug(f"{decode_str=}")
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
        self._chat_list_lock = asyncio.Lock()

    async def login(self, username: str, password: str) -> int | None:
        if self._uid is not None and self._username is not None:
            return self._uid
        uid: int | None = await self._rpc.login.login(username=username, password=password)
        log.debug(f"{uid=}")
        if uid is not None:
            self._uid = uid
            self._username = username
        return uid

    async def register(self, username: str, password: str) -> bool:
        # Note: this only register, won't login
        success = await self._rpc.login.register(username=username, password=password)
        return success

    def check_authorized(self) -> None:
        if self._uid is None or self._username is None:
            raise NotAuthorizedError()

    async def send(self, msg: str, chat: int) -> None:
        self.check_authorized()
        if chat not in self._chat_list:
            raise ChatNotJoinedError()
        if self._username is None:
            raise NotAuthorizedError()
        log.debug(f"{self._chat_list=}")
        await self._exchanger.send_msg(self._username, msg, chat)    
    
    async def recv(self) -> tuple[str, str, int]:
        raw_message: Any = None
        username = ""
        msg = ""
        chat = -1
        while raw_message is None:
            while not self._chat_list:
                await asyncio.sleep(1)
            raw_message = await self._pubsub.get_message(ignore_subscribe_messages=True)
            if raw_message is None:
                continue
            log.debug(f"{raw_message['data']=} {raw_message['channel']=}")
            try:
                json_content = json.loads(raw_message["data"].decode())
                username = json_content["username"]
                msg = json_content["msg"]
                chat = int(raw_message["channel"][9:])
                log.debug(f"{username=} {msg=} {chat=}")
            except Exception as e:
                log.debug(e, exc_info=True)
                raw_message = None
        return username, msg, chat

    async def chat_create(self, name: str) -> int:
        warnings.warn(DeprecationWarning("chat_create is deprecated, use chat_create2 instead"))
        self.check_authorized()
        return await self._rpc.chat.create(name=name)

    async def chat_create2(self, name: str) -> int:
        self.check_authorized()
        return await self._rpc.chat.create_with_user(name=name, user_id=self._uid)

    async def chat_get_name(self, id: int) -> str:
        self.check_authorized()
        return await self._rpc.chat.get_name(id=id)

    async def chat_get_users(self, id: int) -> list[int]:
        self.check_authorized()
        return await self._rpc.chat.get_users(id=id)

    async def chat_join(self, id: int) -> bool:
        self.check_authorized()
        if id in self._chat_list:
            raise ChatAlreadyJoinedError()
        if not await self._rpc.chat.join(chat_id=id, user_id=self._uid):
            return False
        log.debug(f"messages:{id}")
        await self._pubsub.subscribe(f"messages:{id}")
        async with self._chat_list_lock:
            self._chat_list.add(id)
        return True
    
    async def chat_quit(self, id: int) -> bool:
        self.check_authorized()
        if id not in self._chat_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.quit(chat_id=id, user_id=self._uid):
            return False
        log.debug(f"messages:{id}")
        await self._pubsub.unsubscribe(f"messages:{id}")
        async with self._chat_list_lock:
            self._chat_list.remove(id)
        return True

    async def chat_list_somebody_joined(self) -> list[tuple[int, str]]:
        self.check_authorized()
        result: list[tuple[int, str]] = [
            cast(Any, tuple(i)) for i in await self._rpc.chat.list_somebody_joined(id=self._uid)
        ]
        result_set = {i[0] for i in result}
        async with self._chat_list_lock:
            for i in self._chat_list - result_set:
                # Chats quit or kicked
                await self._pubsub.unsubscribe(f"messages:{i}")
            for i in result_set - self._chat_list:
                # Chats joined
                await self._pubsub.subscribe(f"messages:{i}")
            self._chat_list = result_set
        return result

    async def chat_kick(self, chat_id: int, kicked_user_id: int) -> bool:
        self.check_authorized()
        return await self._rpc.chat.kick(chat_id=chat_id, user_id=self._uid, kicked_user_id=kicked_user_id)

    async def chat_rename(self, chat_id: int, new_name: str) -> bool:
        self.check_authorized()
        return await self._rpc.chat.rename(chat_id=chat_id, user_id=self._uid, new_name=new_name)

    def __aiter__(self) -> RpcExchangerClient:
        return self

    async def __anext__(self) -> tuple[str, str, int]:
        return await self.recv()

    async def __aenter__(self) -> RpcExchangerClient:
        self._pubsub = await self._pubsub_raw.__aenter__()
        return self

    async def __aexit__(self, *args) -> None:
        await self._pubsub_raw.__aexit__(None, None, None)
        return None


__all__ = ["RpcExchanger", "RpcExchangerClient", "ChatAlreadyJoinedError", "ChatNotJoinedError", "UnknownError", "NotAuthorizedError"]
