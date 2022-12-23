from typing import NamedTuple

import asyncio
import socket
import json
import logging
import redis.asyncio as redis

import websockets
import uvloop

VCC_MAGIC = 0x01328e22


class Request(NamedTuple):
    magic: int
    type: int
    uid: int
    session: int
    flags: int
    usrname: str
    msg: str

class Exchanger:
    _sock: socket.SocketType
    _redis: redis.Redis
    _pubsub_raw: redis.client.PubSub
    _pubsub: redis.client.PubSub
    async def init(self) -> None:
        loop = asyncio.get_event_loop()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setblocking(False)
        sock.bind(("0.0.0.0", 0))
        await loop.sock_connect(sock, ("127.0.0.1", 274))
        await loop.sock_sendall(sock, b'{"type": "handshake","role": "client"}')
        self._jobid = json.loads((await loop.sock_recv(sock, 65536)).decode())["initial_jobid"]
        self._sock = sock

        self._redis = redis.Redis(host="localhost")
        self._pubsub_raw = self._redis.pubsub()
        self._pubsub = await self._pubsub_raw.__aenter__()
        await self._pubsub.subscribe("messages")

    async def close(self):
        await self._pubsub_raw.__aexit__(None, None, None)
        await self._redis.close()
        self._sock.shutdown(socket.SHUT_RDWR)
        self._sock.close()

    async def send_msg(self, username: str, msg: str) -> None:
        await self._redis.publish("messages", json.dumps({
            "username": username,
            "msg": msg
        }))

    async def recv_msg(self):
        raw_message = None
        while raw_message is None:
            raw_message = await self._pubsub.get_message(ignore_subscribe_messages=True)
            try:
                json_content = json.loads(raw_message["data"].decode())
            except:
                raw_message = None
        return Request(magic=VCC_MAGIC,type=2,uid=0,session=0,flags=0,usrname=json_content["username"],msg=json_content["msg"])

    async def login(self, username, password):
        loop = asyncio.get_event_loop()
        await loop.sock_sendall(self._sock, json.dumps({
            "type": "request",
            "service": "login",
            "data": {
                "username": username,
                "password": password
            },
            "jobid": self._jobid
        }).encode())
        login_success: bool = json.loads((await loop.sock_recv(self._sock, 65536)).decode())["data"]
        logging.info(f"login_success: {login_success}")
        return Request(magic=VCC_MAGIC,type=4,uid=int(login_success),session=0,flags=0, usrname="", msg="")
        

websocket_list = []

async def recv_loop(exchanger: Exchanger):
    loop = asyncio.get_event_loop()
    try:
        while True:
            json_msg = json.dumps((await exchanger.recv_msg())._asdict())
            for websocket in websocket_list:
                await websocket.send(json_msg)
    except asyncio.CancelledError:
        pass
    except socket.gaierror:
        pass
    except Exception as e:
        logging.info(e)
        raise


async def send_loop(websocket, exchanger: Exchanger, cancel_func):
    loop = asyncio.get_event_loop()
    try:
        while True:
            json_msg = await websocket.recv()
            json_result = json.loads(json_msg)
            if json_result["type"] == 4:
                login_result = await exchanger.login(json_result["usrname"], json_result["msg"])
                await websocket.send(json.dumps(login_result._asdict()))
            else:
                await exchanger.send_msg(json_result["usrname"], json_result["msg"])
    except asyncio.CancelledError:
        websocket_list.remove(websocket)
    except TypeError:
        websocket_list.remove(websocket)
    except websockets.ConnectionClosedOK:
        websocket_list.remove(websocket)
    except Exception as e:
        logging.info(e)
        websocket_list.remove(websocket)
        cancel_func()

async def loop(websocket, exchanger: Exchanger):
    send_loop_task: asyncio.Task[None]
    websocket_list.append(websocket)
    cancel_func = lambda: (
        send_loop_task.cancel()
    )
    remote_ip = websocket.remote_address[0]
    logging.info(f"{remote_ip} connected")
    send_loop_task = asyncio.create_task(send_loop(websocket, exchanger, cancel_func))
    await send_loop_task

async def main():
    logging.basicConfig(level=logging.INFO)
    exchanger = Exchanger()
    await exchanger.init()
    try:
        async with websockets.serve(lambda ws: loop(ws, exchanger), "", 7000):
            logging.info("started: ws://localhost:7000")
            await asyncio.create_task(recv_loop(exchanger))
    finally:
        await exchanger.close()

uvloop.install()
asyncio.run(main())