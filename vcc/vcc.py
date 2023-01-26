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
from typing import Any, Awaitable, Callable, cast, TypedDict, Literal, overload, no_type_check_decorator
from os import getenv

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
class ProviderNotFoundError(RpcException):
    pass

class RpcExchangerRpcHandler2:
    def __init__(self, exchanger: RpcExchanger,  provider: str) -> None:
        self._exchanger = exchanger
        self._provider = provider

    def __getattr__(self, service: str) -> Callable[..., Awaitable[Any]]:
        async def func(**data: dict[str, Any]) -> Any:
            log.debug(f"{self._provider=} {service=} {data=}")
            result = await self._exchanger.rpc_request(self._provider+"/"+service, data)
            log.debug(f"{result=}")
            return result
            
        return func

class RpcExchangerRpcHandler:
    def __init__(self, exchanger: RpcExchanger) -> None:
        self._exchanger = exchanger

    def __getattr__(self, provider: str) -> RpcExchangerRpcHandler2:
        return RpcExchangerRpcHandler2(self._exchanger, provider)

class RedisMessage(TypedDict):
    username: str
    msg: str
    # TODO: add NotRequired after upgrading to python3.11
    session: str
    chat: int

Event = Literal["join", "quit", "kick", "rename", "invite"]

MessageCallback = Callable[[str, str, int, str | None], None | Awaitable[None]]
EventCallback = Callable[[Event, Any, int], None | Awaitable[None]]

class RedisEvent(TypedDict):
    type: Event
    data: Any
    chat: int

class RpcExchanger:
    """Low-level api which is hard to use"""
    _sock: socket.socket
    _redis: redis.Redis[bytes]

    
    def __init__(self, *, rpc_host: str | None=None, rpc_port: int | None=None, redis_url: str | None=None) -> None:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("0.0.0.0", 0))
        self._sock = sock

        host_env=self.get_host()
        rpc_host = host_env[0] if rpc_host is None else rpc_host
        rpc_port = host_env[1] if rpc_port is None else rpc_port
        redis_url = getenv("REDIS_URL", "redis://localhost:6379") if redis_url is None else redis_url

        self._socket_address = (rpc_host, rpc_port)
        self._redis = redis.Redis.from_url(cast(Any, redis_url))
        self._pubsub_raw: PubSub = self._redis.pubsub()
        self._responses: dict[str, Any] = {}
        self._recv_lock = asyncio.Lock()
        self.rpc = RpcExchangerRpcHandler(self)

    def get_host(self) -> tuple[str, int]:
        if "RPCHOST" in os.environ:
            host = os.environ["RPCHOST"].split(":")
            return host[0], int(host[1])
        else:
            return ("localhost", 2474)

    async def __aenter__(self) -> RpcExchanger:
        loop = asyncio.get_event_loop()
        sock = self._sock
        sock.setblocking(False)
        await loop.sock_connect(sock, self._socket_address)
        await loop.sock_sendall(sock, b'{"type": "handshake","role": "client"}\r\n')
        await loop.sock_recv(sock, 65536)
        self.pubsub: PubSub = await self._pubsub_raw.__aenter__()
        await self.pubsub.subscribe("messages")
        await self.pubsub.subscribe("events")
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self._pubsub_raw.__aexit__(*args)
        await self._redis.close()
        self._sock.shutdown(socket.SHUT_RDWR)
        self._sock.close()

    async def send_msg(self, username: str, msg: str, chat: int, session: str | None=None) -> None:
        log.debug(f"messages")
        await self._redis.publish(f"messages", json.dumps({
            "username": username,
            "msg": msg,
            "chat": chat,
            **({} if session is None else {"session": session})
        }))
        log.debug(f"{username=} {msg=} {chat=}")

    async def sock_recvline(self) -> str:
        loop = asyncio.get_event_loop()
        data=b""
        async with self._recv_lock:
            while True:
                recv=await loop.sock_recv(self._sock,1)

                if recv!=b'\r':
                    data+=recv
                else:
                    await loop.sock_recv(self._sock,1) # \n
                    return data.decode()
    async def rpc_request(self, service: str, data: Any) -> Any:
        loop = asyncio.get_event_loop()
        new_uuid = str(uuid.uuid4())
        await loop.sock_sendall(self._sock, json.dumps({
            "type": "request",
            "service": service,
            "data": data,
            "jobid": new_uuid
        }).encode() + b"\r\n")
        logging.debug(f"{service=}{data=}")
        while True:
            if new_uuid in self._responses:
                json_res = self._responses[new_uuid]
                del self._responses[new_uuid]
                break
            json_res = json.loads(await self.sock_recvline())
            if "jobid" not in json_res:
                logging.debug(f"{json_res=}")
                raise RpcException("packets so fast")
            if json_res["jobid"] == new_uuid:
                break
            else:
                self._responses[json_res["jobid"]] = json_res
        if "error" in json_res:
            match json_res["error"]:
                case "no such service":
                    raise RpcException(f"no such service {service}")
                case "invalid request data type":
                    raise TypeError("invalid request data type")
                case "wrong format":
                    raise TypeError("wrong format")
                case _:
                    raise UnknownError()
        return json_res["data"]

    def get_redis_instance(self) -> redis.Redis[bytes]:
        return self._redis

    def create_client(self) -> RpcExchangerClient:
        return RpcExchangerClient(self)

    def create_robot_client(self) -> RpcRobotExchangerClient:
        return RpcRobotExchangerClient(self)
    

class RpcExchangerClient:
    _exchanger: RpcExchanger
    _chat_list: set[int]
    _session_list: set[tuple[int, str]]
    _id: int | None
    _name: str | None
    _pubsub: PubSub
    _rpc: RpcExchangerRpcHandler

    _msg_callback: MessageCallback | None
    _event_callbacks: dict[Event, EventCallback]

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
        self._rpc = self._exchanger.rpc
        self._chat_list_lock = asyncio.Lock()
        self._msg_callback = None
        self._event_callbacks = {}
        self._pubsub = self._exchanger.pubsub

    async def login(self, username: str, password: str) -> int | None:
        if self._id is not None and self._name is not None:
            return self._id
        uid: int | None = await self._rpc.login.login(username=username, password=password)
        if uid is not None:
            self._id = uid
            self._name = username
            await self._rpc.login.add_online(id=uid)
        return uid
    async def request_oauth(self,platform:str)-> tuple[str,str]:
        provider_name="oauth_"+platform
        providers=await self._rpc.rpc.list_providers()
        if not provider_name in providers:
            raise ProviderNotFoundError()
        return cast(tuple[str,str],await getattr(self._rpc,provider_name).request_oauth())
    async def login_oauth(self,platform:str,requestid:str):
        """
        Do this in a task! this will takes a long time
        """
        provider_name="oauth_"+platform
        providers=await self._rpc.rpc.list_providers()
        if not provider_name in providers:
            raise ProviderNotFoundError()
        userinfo=await getattr(self._rpc,provider_name).login_oauth(requestid=requestid)
        uid=await self._rpc.login.post_oauth(platform=platform,metadata=userinfo)
        self._uid=uid
        self._username=userinfo
        return uid
    async def add_online(self) -> None:
        self.check_authorized()
        await self._rpc.login.add_online(id=self._id)
    async def is_online(self, user_ids: list[int]) -> list[bool]:
        self.check_authorized()
        return cast(list[bool], await self._rpc.login.is_online(ids=user_ids))

    async def register(self, username: str, password: str, *, auto_login: bool=False) -> bool:
        # Note: this only register, won't login
        success = await self._rpc.login.register(username=username, password=password)
        if success and auto_login:
            await self.login(username, password)
        return cast(bool, success)

    def check_authorized(self) -> None:
        if self._id is None or self._name is None:
            raise NotAuthorizedError()

    def check_joined(self, chat: int) -> None:
        if chat not in self._chat_list:
            raise ChatNotJoinedError()

    def check_not_joined(self, chat: int) -> None:
        if chat in self._chat_list:
            raise ChatAlreadyJoinedError()

    async def send(self, msg: str, chat: int, session: str | None) -> None:
        self.check_authorized()
        self.check_joined(chat)
        if session is not None and (chat, session) not in self._session_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.check_send(chat_id=chat, user_id=self._id):
            raise PermissionDeniedError()
        await self._exchanger.send_msg(cast(str, self._name), msg, chat, session)   

    async def send_with_another_username(self, username: str, msg: str, chat: int, session: str | None) -> None:
        self.check_authorized()
        self.check_joined(chat)
        if session is not None and (chat, session) not in self._session_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.check_send_with_another_username(chat_id=chat, user_id=self._id):
            raise PermissionDeniedError()
        await self._exchanger.send_msg(username, msg, chat, session)  
    
    async def recv(self) -> tuple[Literal["message"], str, str, int, str | None] | tuple[Literal["event"], Event, Any, int]:
        raw_message: Any = None

        while True:
            raw_message = await self._pubsub.get_message(ignore_subscribe_messages=True)
            if raw_message is None:
                await asyncio.sleep(0.01)
                continue
            log.debug(f"{raw_message['data']=} {raw_message['channel']=}")
            try:
                json_content_untyped: Any = json.loads(raw_message["data"].decode())
                if raw_message["channel"] == b"messages":
                    json_message: RedisMessage = json_content_untyped
                    session: str | None = None
                    username = json_message["username"]
                    msg = json_message["msg"]
                    chat = int(json_message["chat"])
                    if chat not in self._chat_list:
                        continue
                    if "session" in json_message:
                        session = json_message["session"]
                        if (chat, session) not in self._session_list:
                            continue
                    log.debug(f"{username=} {msg=} {chat=} {session=}")
                    return "message", username, msg, chat, session
                elif raw_message["channel"] == b"events":
                    json_content: RedisEvent = json_content_untyped
                    type = json_content["type"]
                    data = json_content["data"]
                    chat = int(json_content["chat"])
                    if chat not in self._chat_list:
                        continue
                    match type:
                        case "join" if data["user_id"] == self._id:
                            self._chat_list.add(chat)
                        case "quit" if data["user_id"] == self._id:
                            self._chat_list.discard(chat)
                        case "kick" if data["kicked_user_id"] == self._id:
                            self._chat_list.discard(chat)
                        case "invite" if data["invited_user_id"] == self._id:
                            self._chat_list.add(chat)
                    return "event", type, data, chat
            except Exception as e:
                log.debug(e, exc_info=True)
                raw_message = None
                await asyncio.sleep(0.01)

    async def session_join(self, name: str, chat_id: int) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        result = await self._rpc.chat.check_create_session(chat_id=chat_id, user_id=self._id)
        if result:
            self._session_list.add((chat_id, name))
        return cast(bool, result)

    async def chat_create(self, name: str, parent_chat_id: int=-1) -> int:
        """Create a new chat, user will join the chat created after creating"""
        self.check_authorized()
        if parent_chat_id != -1:
            self.check_joined(parent_chat_id)
        return cast(int, await self._rpc.chat.create_with_user(name=name, user_id=self._id, parent_chat_id=parent_chat_id))

    async def chat_get_name(self, id: int) -> str:
        """Get name of chat by id"""
        self.check_authorized()
        return cast(str, await self._rpc.chat.get_name(id=id))

    async def chat_get_users(self, id: int) -> list[tuple[int, str]]:
        """Get id of all users in the chat"""
        self.check_authorized()
        return cast(list[tuple[int, str]], [tuple(i) for i in await self._rpc.chat.get_users(id=id)])

    async def chat_join(self, id: int) -> bool:
        """Join a chat by its id"""
        self.check_authorized()
        self.check_not_joined(id)
        if not await self._rpc.chat.join(chat_id=id, user_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.add(id)
        return True
    
    async def chat_quit(self, id: int) -> bool:
        """Quit a chat by its id"""
        self.check_authorized()
        self.check_joined(id)
        if not await self._rpc.chat.quit(chat_id=id, user_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.discard(id)
        return True

    async def chat_list_somebody_joined(self) -> list[tuple[int, str, int | None]]:
        """Deprecated alias of chat_list"""
        warnings.warn(DeprecationWarning("This method is deprecated, use chat_list instead"))
        return await self.chat_list()

    async def chat_list(self) -> list[tuple[int, str, int | None]]:
        """List all chat you joined"""
        self.check_authorized()
        result: list[tuple[int, str, int | None]] = [
            cast(Any, tuple(i)) for i in await self._rpc.chat.list_somebody_joined(id=self._id)
        ]
        result_set = {i[0] for i in result}
        async with self._chat_list_lock:
            self._chat_list = result_set
        return result

    async def chat_list_sub_chats(self, id: int) -> list[tuple[int, str]]:
        """List all sub-chats of a chat"""
        self.check_authorized()
        self.check_joined(id)
        return cast(list[tuple[int, str]], await self._rpc.chat.list_sub_chats(id=id))

    async def chat_kick(self, chat_id: int, kicked_user_id: int) -> bool:
        """List all chat you joined"""
        self.check_authorized()
        self.check_joined(chat_id)
        if self._id == kicked_user_id:
            return False
        return cast(bool, await self._rpc.chat.kick(chat_id=chat_id, user_id=self._id, kicked_user_id=kicked_user_id))

    async def chat_rename(self, chat_id: int, new_name: str) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        return cast(bool, await self._rpc.chat.rename(chat_id=chat_id, user_id=self._id, new_name=new_name))

    async def chat_invite(self, chat_id: int, user_id: int) -> bool:
        self.check_authorized()
        self.check_not_joined(chat_id)
        return cast(bool, await self._rpc.chat.invite(chat_id=chat_id, user_id=user_id, invited_user_id=self._id))

    async def chat_modify_user_permission(self, chat_id: int, modified_user_id: int, name: ChatUserPermissionName, value: bool) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        return cast(bool, await self._rpc.chat.modify_user_permission(chat_id=chat_id, user_id=self._id, modified_user_id=modified_user_id, name=name, value=value))

    async def chat_get_user_permission(self, chat_id: int, user_id: int) -> dict[ChatUserPermissionName, bool]:
        self.check_authorized()
        self.check_joined(chat_id)
        return cast(dict[ChatUserPermissionName, bool], await self._rpc.chat.get_user_permission(chat_id=chat_id, user_id=user_id))

    async def chat_modify_permission(self, chat_id: int, name: ChatPermissionName, value: bool) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        return cast(bool, await self._rpc.chat.modify_permission(chat_id=chat_id, user_id=self._id, name=name, value=value))

    async def chat_get_permission(self, chat_id: int) -> dict[ChatPermissionName, bool]:
        self.check_authorized()
        self.check_joined(chat_id)
        return cast(dict[ChatPermissionName, bool], await self._rpc.chat.get_permission(chat_id=chat_id))

    async def chat_get_all_permission(self, chat_id: int) -> dict[int, dict[ChatUserPermissionName, bool]]:
        self.check_authorized()
        self.check_joined(chat_id)
        return cast(dict[int, dict[ChatUserPermissionName, bool]], await self._rpc.chat.get_all_user_permission(chat_id=chat_id))

    async def file_new_object(self, name: str, id: str | None=None, bucket: str="file") -> tuple[str, str]:
        self.check_authorized()
        return cast(tuple[str, str], await self._rpc.file.new_object(name=name, id=str(uuid.uuid4()) if id is None else id, bucket=bucket))

    async def file_new_object_with_content(self, name: str, content: str, bucket: str="file") -> str:
        self.check_authorized()
        return cast(str, await self._rpc.file.new_object_with_content(name=name, content=content, bucket=bucket))

    async def file_get_object(self, id: str, bucket: str="file") -> tuple[str, str]:
        self.check_authorized()
        return cast(tuple[str, str], await self._rpc.file.get_object(id=id, bucket=bucket))

    async def file_get_object_content(self, id: str, bucket: str="file") -> tuple[str, str]:
        self.check_authorized()
        return cast(tuple[str, str], await self._rpc.file.get_object_content(id=id, bucket=bucket))

    def __aiter__(self) -> RpcExchangerClient:
        return self

    async def __anext__(self) -> tuple[Literal["message"], str, str, int, str | None] | tuple[Literal["event"], Event, Any, int]:
        return await self.recv()

    async def __aenter__(self) -> RpcExchangerClient:
        return self

    async def __aexit__(self, *args: Any) -> None:
        if self._id is not None:
            await self._rpc.login.add_offline(id=self._id)
        return None

    @overload
    def on(self, type: Literal["message"]) -> Callable[[MessageCallback], MessageCallback]: ...

    @overload
    def on(self, type: Literal["event"], event_type: Event) -> Callable[[EventCallback], EventCallback]: ...

    @no_type_check_decorator
    def on(self, type: Any, event_type: Any = None) -> Any:
        if type == "message" and event_type is None:
            def message_callback_handler(callback: MessageCallback) -> MessageCallback:
                self._msg_callback = callback
                return callback
            return message_callback_handler
        elif type == "event" and event_type is not None:
            def event_callback_handler(callback: EventCallback) -> EventCallback:
                self._event_callbacks[cast(Any, event_type)] = callback
                return callback
            return event_callback_handler
        else:
            raise TypeError("Wrong usage")

    async def run_forever(self) -> None:
        async for result in self:
            if result[0] == "message":
                _, username, msg, chat, session = result
                if self._msg_callback is not None:
                    returned = self._msg_callback(username, msg, chat, session)
                    if isinstance(returned, Awaitable):
                        await returned
            else:
                _, type, data, chat = result
                if type in self._event_callbacks:
                    returned = self._event_callbacks[type](type, data, chat)
                    if isinstance(returned, Awaitable):
                        await returned



class RpcRobotExchangerClient:
    _exchanger: RpcExchanger
    _chat_list: set[int]
    _id: int | None
    _name: str | None
    _pubsub: PubSub
    _rpc: RpcExchangerRpcHandler

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def name(self) -> str | None:
        return self._name

    def __init__(self, exchanger: RpcExchanger) -> None:
        self._exchanger = exchanger
        self._chat_list = set()
        self._id = None
        self._name = None
        self._rpc = self._exchanger.rpc
        self._chat_list_lock = asyncio.Lock()
        self._pubsub = self._exchanger.pubsub

    async def login(self, name: str, token: str) -> int | None:
        if self._id is not None and self._name is not None:
            return self._id
        uid: int | None = await self._rpc.bot.login(name=name, token=token)
        if uid is not None:
            self._id = uid
            self._name = name
        return uid

    async def is_online(self, user_ids: list[int]) -> list[bool]:
        return await RpcExchangerClient.is_online(cast(Any, self), user_ids)

    async def register(self, name: str, token: str) -> int | None:
        # Note: this only register, won't login
        if self._id is not None and self._name is not None:
            return self._id
        uid: int | None = await self._rpc.bot.register(name=name, token=token)
        if uid is not None:
            self._id = uid
            self._name = name
        return uid

    def check_authorized(self) -> None:
        RpcExchangerClient.check_authorized(cast(Any, self))

    def check_joined(self, chat: int) -> None:
        RpcExchangerClient.check_joined(cast(Any, self), chat)

    def check_not_joined(self, chat: int) -> None:
        RpcExchangerClient.check_not_joined(cast(Any, self), chat)

    async def send(self, username: str, msg: str, chat: int, session: str | None) -> None:
        self.check_authorized()
        self.check_joined(chat)
        if not await self._rpc.bot.check_send(chat_id=chat, bot_id=self._id):
            raise PermissionDeniedError()
        await self._exchanger.send_msg(f"{username}[{cast(str, self.name)}]", msg, chat, session)
    
    async def recv(self) -> tuple[Literal["message"], str, str, int, str | None] | tuple[Literal["event"], Event, Any, int]:
        return await RpcExchangerClient.recv(cast(Any, self))

    async def chat_get_name(self, id: int) -> str:
        """Get name of chat by id"""
        return await RpcExchangerClient.chat_get_name(cast(Any, self), id)

    async def chat_get_users(self, id: int) -> list[tuple[int, str]]:
        """Get id of all users in the chat"""
        return await RpcExchangerClient.chat_get_users(cast(Any, self), id)

    async def chat_join(self, id: int) -> bool:
        """Join a chat by its id"""
        self.check_authorized()
        self.check_not_joined(id)
        if not await self._rpc.bot.join(chat_id=id, bot_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.add(id)
        return True
    
    async def chat_quit(self, id: int) -> bool:
        """Quit a chat by its id"""
        self.check_authorized()
        self.check_joined(id)
        if not await self._rpc.bot.quit(chat_id=id, bot_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.discard(id)
        return True

    async def chat_list(self) -> list[tuple[int, str, int | None]]:
        """List all chat you joined"""
        self.check_authorized()
        result: list[tuple[int, str, int | None]] = [
            cast(Any, tuple(i)) for i in await self._rpc.bot.list_chat(id=self._id)
        ]
        result_set = {i[0] for i in result}
        async with self._chat_list_lock:
            self._chat_list = result_set
        return result

    async def chat_list_sub_chats(self, id: int) -> list[tuple[int, str]]:
        """List all sub-chats of a chat"""
        self.check_authorized()
        self.check_joined(id)
        return cast(list[tuple[int, str]], await self._rpc.chat.list_sub_chats(id=id))

    async def chat_kick(self, chat_id: int, kicked_user_id: int) -> bool:
        """List all chat you joined"""
        self.check_authorized()
        self.check_joined(chat_id)
        if self._id == kicked_user_id:
            return False
        return cast(bool, await self._rpc.bot.kick(chat_id=chat_id, bot_id=self._id, kicked_user_id=kicked_user_id))

    async def chat_rename(self, chat_id: int, new_name: str) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        return cast(bool, await self._rpc.bot.rename(chat_id=chat_id, bot_id=self._id, new_name=new_name))

    async def chat_modify_user_permission(self, chat_id: int, modified_user_id: int, name: ChatUserPermissionName, value: bool) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        return cast(bool, await self._rpc.bot.modify_user_permission(chat_id=chat_id, bot_id=self._id, modified_user_id=modified_user_id, name=name, value=value))

    async def chat_get_user_permission(self, chat_id: int, user_id: int) -> dict[ChatUserPermissionName, bool]:
        return await RpcExchangerClient.chat_get_user_permission(cast(Any, None), chat_id, user_id)

    async def chat_modify_permission(self, chat_id: int, name: ChatPermissionName, value: bool) -> bool:
        self.check_authorized()
        self.check_joined(chat_id)
        return cast(bool, await self._rpc.bot.modify_permission(chat_id=chat_id, bot_id=self._id, name=name, value=value))

    async def chat_get_permission(self, chat_id: int) -> dict[ChatPermissionName, bool]:
        return await RpcExchangerClient.chat_get_permission(cast(Any, None), chat_id)

    async def chat_get_all_permission(self, chat_id: int) -> dict[int, dict[ChatUserPermissionName, bool]]:
        return await RpcExchangerClient.chat_get_all_permission(cast(Any, None), chat_id)

    def __aiter__(self) -> RpcRobotExchangerClient:
        return self

    async def __anext__(self) -> tuple[Literal["message"], str, str, int, str | None] | tuple[Literal["event"], Event, Any, int]:
        return await self.recv()

    async def __aenter__(self) -> RpcRobotExchangerClient:
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None
