from vcc import RpcExchanger, RpcExchangerClient, ChatUserPermissionName, ChatPermissionName, NotAuthorizedError
from typeguard import typechecked
from typing import Any
from uuid import uuid4

import json
import asyncio
import uvloop
import sys
import jwt
import logging
import websockets.server
from websockets.exceptions import ConnectionClosed

class ServerError(Exception):
    pass

with open("config.json") as f:
    config = json.load(f)
    key = config["key"]

@typechecked
class ClientHandler:
    def __init__(self, client: RpcExchangerClient) -> None:
        self._client = client

    def generate_jwt(self) -> str:
        if self._client.username is None or self._client.uid is None:
            raise ServerError("Generate jwt without logging in")
        return jwt.encode({
            "username": self._client.username,
            "uid": self._client.uid
        }, key, "HS512")

    async def login(self, username: str, password: str) -> dict[str, str]:
        if self._client.uid is not None:
            return {
                "token": self.generate_jwt()
            }
        result = await self._client.login(username, password)
        if result is None:
            raise ServerError("Wrong username or password")
        return {
            "token": self.generate_jwt()
        }

    async def register(self, username: str, password: str) -> None:
        result = await self._client.register(username, password)
        if not result:
            raise ServerError("Duplicated username")

    async def message(self, msg: str, chat: int, session: str | None = None) -> None:
        await self._client.send(msg, chat, session)

    async def chat_create(self, name: str, parent_chat_id: int = -1) -> int:
        return await self._client.chat_create(name, parent_chat_id)

    async def chat_join(self, id: int) -> None:
        if not await self._client.chat_join(id):
            raise ServerError("Operation failed, maybe the chat does not exist, you have already joined, you have been banned, the chat is not public")

    async def chat_get_users(self, id: int) -> list[int]:
        return await self._client.chat_get_users(id)

    async def chat_quit(self, id: int) -> None:
        if not await self._client.chat_quit(id):
            raise ServerError("Operation failed, maybe you didn't join the chat")

    async def chat_list(self) -> list[tuple[int, str, int | None]]:
        return await self._client.chat_list()

    async def chat_kick(self, chat_id: int, kicked_user_id: int) -> None:
        if not await self._client.chat_kick(chat_id, kicked_user_id):
            raise ServerError("Permission denied, or you didn't join the chat")

    async def chat_rename(self, chat_id: int, new_name: str) -> None:
        if not await self._client.chat_rename(chat_id, new_name):
            raise ServerError("Permission denied, or you didn't join the chat")

    async def chat_modify_user_permission(self, chat_id: int, modified_user_id: int, name: ChatUserPermissionName, value: bool) -> None:
        if not await self._client.chat_modify_user_permission(chat_id, modified_user_id, name, value):
            raise ServerError("Permission denied, or you didn't join the chat")

    async def chat_modify_permission(self, chat_id: int, name: ChatPermissionName, value: bool) -> None:
        if not await self._client.chat_modify_permission(chat_id, name, value):
            raise ServerError("Permission denied, or you didn't join the chat")

    async def chat_get_permission(self, chat_id: int) -> dict[ChatPermissionName, bool]:
        return await self._client.chat_get_permission(chat_id)

    async def chat_get_all_permission(self, chat_id: int) -> dict[int, dict[ChatUserPermissionName, bool]]:
        return await self._client.chat_get_all_permission(chat_id)

async def recv_message_loop(client: RpcExchangerClient, websocket: websockets.server.WebSocketServerProtocol) -> None:
    try:
        async for i in client:
            if i[0] != "message":
                continue
            _, username, msg, chat, session = i
            await websocket.send(json.dumps({
                "type": "message",
                "ok": True,
                "id": str(uuid4()),
                "response": {
                    "username": username,
                    "msg": msg,
                    "chat": chat,
                    "session": session
                }
            }))
    except asyncio.CancelledError:
        pass

async def handle_client(exchanger: RpcExchanger, websocket: websockets.server.WebSocketServerProtocol) -> None:
    logging.info(f"new connection: {websocket.remote_address}")
    async with exchanger.create_client() as client:
        # Request: {"type": "message", "id": "3a9b50b1-0355-496d-96fd-52e908ab931e", "request": {"msg": "quack", "chat": 1, "session": null}}
        handler = ClientHandler(client)
        recv_message_task = asyncio.create_task(recv_message_loop(client, websocket))
        tasks: set[asyncio.Task[None]] = set()

        async def make_error(request_type: str, request_id: str | int, data: str) -> None:
            await websocket.send(json.dumps({
                "type": request_type,
                "ok": False,
                "id": request_id,
                "error": data
            }))

        async def task(request: Any) -> None:
            request_type = request["type"]
            request_body = request["request"]
            request_id = request["id"]
            try:
                if not isinstance(request_type, str) or not isinstance(request_body, dict) or not isinstance(request_id, (int, str)):
                    raise ServerError("Invalid data type")
                if request_type.startswith("_"):
                    raise ServerError("Types cannot start with _")
                response = await getattr(handler, request_type)(**request_body)
                # Response: {"type": "message", "ok": true, "id": "3a9b50b1-0355-496d-96fd-52e908ab931e", "response": null}
                await websocket.send(json.dumps({
                    "type": request_type,
                    "ok": True,
                    "id": request_id,
                    "response": response
                }))
            except ServerError as e:
                await make_error(request_type, request_id, e.args[0])
            except TypeError:
                await make_error(request_type, request_id, "Invalid data type")
            except NotAuthorizedError:
                await make_error(request_type, request_id, "You must login first")
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logging.warning(f"uncaught error: {type(e).__name__}:{str(e)}")
                await websocket.close(1008)
                raise
            finally:
                current_task = asyncio.current_task()
                if current_task is not None:
                    tasks.discard(current_task)
        try:
            async for line in websocket:
                request = json.loads(line)
                tasks.add(asyncio.create_task(task(request)))
        except ConnectionClosed:
            pass
        finally:
            await websocket.close(1008)
            recv_message_task.cancel()
            for i in tasks:
                i.cancel()


async def main() -> None:
    async with RpcExchanger() as exchanger:
        async with websockets.server.serve(lambda *args: handle_client(exchanger, *args), "", 2470):
            await asyncio.Future()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    if sys.version_info >= (3, 11):
        with asyncio.Runner(loop_factory=uvloop.new_event_loop) as runner:
            runner.run(main())
    else:
        uvloop.install()
        asyncio.run(main())
