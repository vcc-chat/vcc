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

from .tools import check, rpc_request

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
            return await self._exchanger.rpc_request(self._provider+"/"+service, data)
            
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
    uid: int

Event = Literal["join", "quit", "kick", "rename", "invite"]

MessageCallback = Callable[[int, str, str, int, str | None], None | Awaitable[None]]
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
        self._pubsub_raw: PubSub = self._redis.pubsub(ignore_subscribe_messages=True)
        self._futures: dict[str, asyncio.Future[Any]] = {}
        self._recv_lock = asyncio.Lock()
        self.rpc = RpcExchangerRpcHandler(self)
        self.client_list: set[RpcExchangerBaseClient] = set()

    def get_host(self) -> tuple[str, int]:
        if "RPCHOST" in os.environ:
            host = os.environ["RPCHOST"].split(":")
            return host[0], int(host[1])
        else:
            return ("localhost", 2474)

    async def recv_task(self):
        raw_message: Any = None

        async for raw_message in self.pubsub.listen():
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
                    uid = int(json_message["uid"])
                    if "session" in json_message:
                        session = json_message["session"]
                    for client in self.client_list:
                        if chat in client._chat_list and (session is None or isinstance(client, RpcRobotExchangerClient) or (chat, session) in client._session_list):
                            client._recv_future.set_result(("message", uid, username, msg, chat, session))
                    if "session" in json_message:
                        session = json_message["session"]
                    log.debug(f"{username=} {msg=} {chat=} {session=}")
                elif raw_message["channel"] == b"events":
                    json_content: RedisEvent = json_content_untyped
                    type = json_content["type"]
                    data = json_content["data"]
                    chat = int(json_content["chat"])
                    for client in self.client_list:
                        if chat in client._chat_list:
                            client._recv_future.set_result(("event", type, data, chat))
            except asyncio.CancelledError:
                return
            except Exception as e:
                log.debug(e, exc_info=True)
                raw_message = None
                await asyncio.sleep(0.01)

    async def rpc_task(self):
        while True:
            json_res = json.loads(await self.sock_recvline())
            if "jobid" not in json_res:
                logging.debug(f"{json_res=}")
                raise RpcException("packets so fast")
            future = self._futures[json_res["jobid"]]
            if "error" in json_res:
                match json_res["error"]:
                    case "no such service":
                        future.set_exception(RpcException("no such service"))
                    case "invalid request data type":
                        future.set_exception(TypeError("invalid request data type"))
                    case "wrong format":
                        future.set_exception(TypeError("wrong format"))
                    case _:
                        future.set_exception(UnknownError)
            else:
                future.set_result(json_res["data"])
            del self._futures[json_res["jobid"]]

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
            
        self._recv_task = asyncio.create_task(self.recv_task())
        self._rpc_task = asyncio.create_task(self.rpc_task())
        return self

    async def __aexit__(self, *args: Any) -> None:
        self._recv_task.cancel()
        self._rpc_task.cancel()
        await self.pubsub.unsubscribe("messages")
        await self.pubsub.unsubscribe("events")
        await self._pubsub_raw.__aexit__(*args)
        await self._redis.close()
        self._sock.shutdown(socket.SHUT_RDWR)
        self._sock.close()

    async def send_msg(self, uid: int, username: str, msg: str, chat: int, session: str | None=None) -> None:
        log.debug(f"messages")
        await self._redis.publish(f"messages", json.dumps({
            "uid": uid,
            "username": username,
            "msg": msg,
            "chat": chat,
            **({} if session is None else {"session": session})
        }))
        log.debug(f"{username=} {msg=} {chat=}")
    async def send_event(self, type:str,data:Any, chat: int, session: str | None=None) -> None:
        log.debug(f"event")
        await self._redis.publish(f"events", json.dumps({
            "type": type,
            "data": data,
            "chat": chat,
            **({} if session is None else {"session": session})
        }))
        log.debug(f"{type=} {chat=}")

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
    async def rpc_request(self, service: str, data: dict[str, Any]) -> Any:
        log.debug(f"{service=} {data=}")
        loop = asyncio.get_event_loop()
        new_uuid = str(uuid.uuid4())
        await asyncio.shield(loop.sock_sendall(self._sock, json.dumps({
            "type": "request",
            "service": service,
            "data": data,
            "jobid": new_uuid
        }).encode() + b"\r\n"))
        logging.debug(f"{service=}{data=}")
        future = asyncio.Future[Any]()
        self._futures[new_uuid] = future
        result = await future
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
    _rpc: RpcExchangerRpcHandler
    _recv_future: asyncio.Future[tuple[Literal["message"], int, str, str, int, str | None] | tuple[Literal["event"], Event, Any, int]]

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
        self._exchanger.client_list.add(self)
        self._recv_future = asyncio.Future()

    @check(auth=True)
    @rpc_request("login/is_online")
    async def is_online(self, ids: list[int]) -> list[bool]: ...

    def check_authorized(self) -> None:
        if self._id is None or self._name is None:
            raise NotAuthorizedError()
    def check_joined(self, chat: int) -> None:
        if chat not in self._chat_list:
            raise ChatNotJoinedError()
    def check_not_joined(self, chat: int) -> None:
        if chat in self._chat_list:
            raise ChatAlreadyJoinedError()
    
    @check(auth=True, joined="chat")
    async def send_with_another_username(self, uid: int, username: str, msg: str, chat: int, session: str | None) -> None:
        if session is not None and (chat, session) not in self._session_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.check_send_with_another_username(chat_id=chat, user_id=self._id):
            raise PermissionDeniedError()
        await self._exchanger.send_msg(uid, username, msg, chat, session)  
    
    async def recv(self) -> tuple[Literal["message"], int, str, str, int, str | None] | tuple[Literal["event"], Event, Any, int]:
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

    @check(auth=True)
    @rpc_request()
    async def chat_get_name(self, id: int) -> str:
        """Get name of chat by id"""
        ...

    @check(auth=True, joined="id")
    async def chat_get_users(self, id: int) -> list[tuple[int, str]]:
        """Get id of all users in the chat"""
        return cast(list[tuple[int, str]], [tuple(i) for i in await self._rpc.chat.get_users(id=id)])

    @check(auth=True, joined="chat_id")
    @rpc_request()
    async def chat_get_user_permission(self, chat_id: int, user_id: int) -> dict[ChatUserPermissionName, bool]: ...

    @check(auth=True, joined="chat_id")
    @rpc_request()
    async def chat_get_permission(self, chat_id: int) -> dict[ChatPermissionName, bool]: ...

    @check(auth=True, joined="chat_id")
    @rpc_request("chat/get_all_user_permission")
    async def chat_get_all_permission(self, chat_id: int) -> dict[int, dict[ChatUserPermissionName, bool]]: ...

    @check(auth=True, joined="id")
    @rpc_request()
    async def chat_list_sub_chats(self, id: int) -> list[tuple[int, str]]:
        """List all sub-chats of a chat"""
        ...

    @check(auth=True)
    async def file_new_object(self, name: str, id: str | None=None, bucket: str="file") -> tuple[str, str]:
        return cast(tuple[str, str], await self._rpc.file.new_object(name=name, id=str(uuid.uuid4()) if id is None else id, bucket=bucket))

    @check(auth=True)
    @rpc_request()
    async def file_new_object_with_content(self, name: str, content: str, bucket: str="file") -> str: ...

    @check(auth=True)
    @rpc_request()
    async def file_get_object(self, id: str, bucket: str="file") -> tuple[str, str]: ...

    @check(auth=True)
    @rpc_request()
    async def file_get_object_content(self, id: str, bucket: str="file") -> tuple[str, str]: ...

    def __aiter__(self) -> RpcExchangerBaseClient:
        return self

    async def __anext__(self) -> tuple[Literal["message"], int, str, str, int, str | None] | tuple[Literal["event"], Event, Any, int]:
        return await self.recv()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args: Any) -> None:
        self._exchanger.client_list.discard(self)
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
                _, uid, username, msg, chat, session = result
                if self._msg_callback is not None:
                    returned = self._msg_callback(uid, username, msg, chat, session)
                    if isinstance(returned, Awaitable):
                        await returned
            else:
                _, type, data, chat = result
                if type in self._event_callbacks:
                    returned = self._event_callbacks[type](type, data, chat)
                    if isinstance(returned, Awaitable):
                        await returned
    

class RpcExchangerClient(RpcExchangerBaseClient):
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
        logging.debug(f"{uid=} {userinfo=}")
        self._id=uid
        self._name=await self._rpc.login.get_name(id=uid)
        return uid
    @check(auth=True)
    async def add_online(self) -> None:
        await self._rpc.login.add_online(id=self._id)
    async def register(self, username: str, password: str, *, auto_login: bool=False) -> bool:
        # Note: this only register, won't login
        success = await self._rpc.login.register(username=username, password=password)
        if success and auto_login:
            await self.login(username, password)
        return cast(bool, success)
    

    @check(auth=True, joined="chat")
    async def send(self, msg: str, chat: int, session: str | None) -> None:
        if session is not None and (chat, session) not in self._session_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.check_send(chat_id=chat, user_id=self._id):
            raise PermissionDeniedError()
        await self._exchanger.send_msg(cast(int, self._id), cast(str, self._name), msg, chat, session)   
    @check(auth=True, joined="chat")
    async def send_typing_event(self,status:bool,chat:int,session: str|None) -> None:
        self.check_authorized()
        self.check_joined(chat)
        if session is not None and (chat, session) not in self._session_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.check_send(chat_id=chat, user_id=self._id):
            raise PermissionDeniedError()
        await self._exchanger.send_event("typing", {
            "status": status,
            "uid": self.id
        }, chat, session)

    @check(auth=True, joined="chat")
    async def send_with_another_username(self, uid: int, msg: str, chat: int, session: str | None) -> None:
        if session is not None and (chat, session) not in self._session_list:
            raise ChatNotJoinedError()
        if not await self._rpc.chat.check_send_with_another_username(chat_id=chat, user_id=self._id):
            raise PermissionDeniedError()
        username = await self._rpc.chat.get_nickname(chat_id=chat, user_id=uid)
        await self._exchanger.send_msg(uid, username, msg, chat, session)  

    @check(auth=True, joined="chat_id")
    async def session_join(self, name: str, chat_id: int) -> bool:
        result = await self._rpc.chat.check_create_session(chat_id=chat_id, user_id=self._id)
        if result:
            self._session_list.add((chat_id, name))
        return cast(bool, result)

    @check(auth=True)
    async def chat_create(self, name: str, parent_chat_id: int=-1) -> int:
        """Create a new chat, user will join the chat created after creating"""
        if parent_chat_id != -1:
            self.check_joined(parent_chat_id)
        return cast(int, await self._rpc.chat.create_with_user(name=name, user_id=self._id, parent_chat_id=parent_chat_id))

    @check(auth=True, not_joined="id")
    async def chat_join(self, id: int) -> bool:
        """Join a chat by its id"""
        if not await self._rpc.chat.join(chat_id=id, user_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.add(id)
        return True
    
    @check(auth=True, joined="id")
    async def chat_quit(self, id: int) -> bool:
        """Quit a chat by its id"""
        if not await self._rpc.chat.quit(chat_id=id, user_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.discard(id)
        return True

    @check(auth=True)
    async def chat_list(self) -> list[tuple[int, str, int | None]]:
        """List all chat you joined"""
        result: list[tuple[int, str, int | None]] = [
            cast(Any, tuple(i)) for i in await self._rpc.chat.list(id=self._id)
        ]
        result_set = {i[0] for i in result}
        async with self._chat_list_lock:
            self._chat_list = result_set
        return result


    @check(auth=True, joined="chat_id")
    async def chat_kick(self, chat_id: int, kicked_user_id: int) -> bool:
        """List all chat you joined"""
        if self._id == kicked_user_id:
            return False
        return cast(bool, await self._rpc.chat.kick(chat_id=chat_id, user_id=self._id, kicked_user_id=kicked_user_id))

    @check(auth=True, joined="chat_id")
    @rpc_request(id_arg="user_id")
    async def chat_rename(self, chat_id: int, new_name: str) -> bool: ...

    @check(auth=True, not_joined="chat_id")
    @rpc_request(id_arg="invited_user_id")
    async def chat_invite(self, chat_id: int, user_id: int) -> bool: ...

    @check(auth=True, joined="chat_id")
    @rpc_request(id_arg="user_id")
    async def chat_modify_user_permission(self, chat_id: int, modified_user_id: int, name: ChatUserPermissionName, value: bool) -> bool: ...

    @check(auth=True, joined="chat_id")
    @rpc_request(id_arg="user_id")
    async def chat_modify_permission(self, chat_id: int, name: ChatPermissionName, value: bool) -> bool: ...

    @check(auth=True, joined="chat_id")
    @rpc_request(id_arg="user_id")
    async def chat_change_nickname(self, chat_id: int, new_name: str) -> None: ...

    @check(auth=True, joined="chat_id")
    @rpc_request(id_arg="user_id")
    async def chat_get_nickname(self, chat_id: int) -> str: ...

    @check(auth=True)
    @rpc_request("login/change_nickname", id_arg="id")
    async def change_nickname(self, nickname: str) -> None: ...

    @check(auth=True)
    @rpc_request("login/get_nickname", id_arg="id")
    async def get_nickname(self) -> str: ...

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

    @check(auth=True, joined="chat")
    async def send(self, uid: int, username: str, msg: str, chat: int, session: str | None) -> None:
        if not await self._rpc.bot.check_send(chat_id=chat, bot_id=self._id):
            raise PermissionDeniedError()
        # -1 means system or robot
        await self._exchanger.send_msg(-1, f"{username}[{cast(str, self.name)}]", msg, chat, session)
    
    @check(auth=True, not_joined="id")
    async def chat_join(self, id: int) -> bool:
        """Join a chat by its id"""
        if not await self._rpc.bot.join(chat_id=id, bot_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.add(id)
        return True
    
    @check(auth=True, joined="id")
    async def chat_quit(self, id: int) -> bool:
        """Quit a chat by its id"""
        if not await self._rpc.bot.quit(chat_id=id, bot_id=self._id):
            return False
        async with self._chat_list_lock:
            self._chat_list.discard(id)
        return True

    @check(auth=True)
    async def chat_list(self) -> list[tuple[int, str, int | None]]:
        """List all chat you joined"""
        result: list[tuple[int, str, int | None]] = [
            cast(Any, tuple(i)) for i in await self._rpc.bot.list_chat(id=self._id)
        ]
        result_set = {i[0] for i in result}
        async with self._chat_list_lock:
            self._chat_list = result_set
        return result

    @check(auth=True, joined="chat_id")
    @rpc_request("bot/kick", id_arg="bot_id")
    async def chat_kick(self, chat_id: int, kicked_user_id: int) -> bool:
        """List all chat you joined"""
        ...

    @check(auth=True, joined="chat_id")
    @rpc_request("bot/rename", id_arg="bot_id")
    async def chat_rename(self, chat_id: int, new_name: str) -> bool: ...

    @check(auth=True, joined="chat_id")
    @rpc_request("bot/modify_user_permission", id_arg="bot_id")
    async def chat_modify_user_permission(self, chat_id: int, modified_user_id: int, name: ChatUserPermissionName, value: bool) -> bool: ...

    @check(auth=True, joined="chat_id")
    @rpc_request("bot/modify_permission", id_arg="bot_id")
    async def chat_modify_permission(self, chat_id: int, name: ChatPermissionName, value: bool) -> bool: ...
