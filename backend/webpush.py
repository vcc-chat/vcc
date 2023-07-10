import asyncio
import os
import subprocess
import json
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from py_vapid import b64urlencode, Vapid

import sanic
import pywebpush
import vcc

# Generate vapid keys
current_directory = Path(__file__).parent
os.chdir(current_directory)
if not (current_directory / "public_key.pem").exists():
    os.system("vapid --gen")

vapid_public_key = (current_directory / "public_key.pem").read_text()
vapid_private_key = (current_directory / "public_key.pem").read_text()

application_server_key = b64urlencode(
    Vapid.from_file("private_key.pem").public_key.public_bytes(  # type: ignore
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
)

_push_list = {}


def push_register(id: int, msg):
    _push_list[id] = msg


def register_recv_hook(exchanger: vcc.RpcExchanger):
    async def handler(msg: vcc.RedisMessage):
        user_list: list[tuple[int, str]] = await exchanger.rpc_request(
            "chat", "get_users", {"id": msg["chat"]}
        )
        chat_name: str = await exchanger.rpc_request(
            "chat", "get_name", {"id": msg["chat"]}
        )
        send_nickname = None
        for id, nickname in user_list:
            if id == msg["uid"]:
                send_nickname = nickname
                break
        task_list = []
        for id, nickname in user_list:
            if id not in _push_list:
                continue
            push_func = lambda: pywebpush.webpush(
                _push_list[id],
                json.dumps(
                    {
                        "chatName": chat_name,
                        "username": send_nickname,
                        "chat": msg["chat"],
                        "msg": msg["msg"],
                        "session": msg.get("session"),
                    }
                ),
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": "mailto:example@example.org"},
            )
            task_list.append(
                asyncio.get_running_loop().run_in_executor(None, push_func)
            )
        await asyncio.gather(*task_list)

    exchanger.recv_hook = handler
