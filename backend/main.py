from typing import NamedTuple

import asyncio
import socket
import struct
import json
import logging

import websockets
import uvloop

VCC_MAGIC = 0x01328e22

REQ_SIZE = 512
USERNAME_SIZE = 32
MSG_SIZE = REQ_SIZE - 5 * 4 - USERNAME_SIZE

VCC_REQUEST_FORMAT = f"<iiiii{USERNAME_SIZE}s{MSG_SIZE}s"
VCC_RELAY_HEADER_FORMAT = f"<iiIii{USERNAME_SIZE}s{USERNAME_SIZE}s"

class RawRelayHeader(NamedTuple):
    magic: int
    type: int
    size: int
    uid: int
    session: int
    usrname: bytes
    visible: bytes

class RawRelay(NamedTuple):
    magic: int
    type: int
    size: int
    uid: int
    session: int
    usrname: bytes
    visible: bytes
    msg: bytes

class Relay(NamedTuple):
    magic: int
    type: int
    size: int
    uid: int
    session: int
    usrname: str
    visible: str
    msg: str


class RawRequest(NamedTuple):
    magic: int
    type: int
    uid: int
    session: int
    flags: int
    usrname: bytes
    msg: bytes

class Request(NamedTuple):
    magic: int
    type: int
    uid: int
    session: int
    flags: int
    usrname: str
    msg: str


def bytes_to_json(a: bytes) -> str:
    raw_req = RawRequest(*struct.unpack(VCC_REQUEST_FORMAT, a))
    req = Request(
        socket.ntohl(raw_req.magic), 
        socket.ntohl(raw_req.type), 
        socket.ntohl(raw_req.uid), 
        socket.ntohl(raw_req.session), 
        raw_req.flags, 
        raw_req.usrname.split(b"\0", 2)[0].decode(errors="ignore"),
        raw_req.msg.split(b"\0", 2)[0].decode(errors="ignore")
    )
    return json.dumps(req._asdict())

def relay_bytes_to_json(a: bytes, size: int) -> str:
    raw_req = RawRelay(*struct.unpack(VCC_RELAY_HEADER_FORMAT + f"{size}s", a))
    req = Relay(
        socket.ntohl(raw_req.magic),
        socket.ntohl(raw_req.type),
        socket.ntohl(raw_req.size),
        socket.ntohl(raw_req.uid),
        socket.ntohl(raw_req.session),
        raw_req.usrname.split(b"\0", 2)[0].decode(errors="ignore"),
        raw_req.visible.split(b"\0", 2)[0].decode(errors="ignore"),
        raw_req.msg.split(b"\0", 2)[0].decode(errors="ignore"),
        
    )
    return json.dumps(req._asdict())

def json_to_bytes(a: str) -> bytes:
    req = Request(**json.loads(a))
    raw_req = RawRequest(
        socket.htonl(req.magic), 
        socket.htonl(req.type), 
        socket.htonl(req.uid), 
        socket.htonl(req.session), 
        req.flags, 
        req.usrname.encode(errors="ignore") + b"\0",
        req.msg.encode(errors="ignore") + b"\0"
    )
    return struct.pack(VCC_REQUEST_FORMAT, *raw_req)

async def recv_loop(websocket, connection: socket.SocketType, cancel_func):
    loop = asyncio.get_event_loop()
    try:
        while True:
            raw_relay_header_bytes = await loop.sock_recv(connection, struct.calcsize(VCC_RELAY_HEADER_FORMAT))
            raw_relay_header = RawRelayHeader(*struct.unpack(VCC_RELAY_HEADER_FORMAT, raw_relay_header_bytes))
            if socket.ntohl(raw_relay_header.magic) != VCC_MAGIC:
                size = socket.ntohl(raw_relay_header.size) - struct.calcsize(VCC_RELAY_HEADER_FORMAT)
                json_msg = relay_bytes_to_json(raw_relay_header_bytes + await loop.sock_recv(connection, size), size)
            else:
                raw_msg = raw_relay_header_bytes + await loop.sock_recv(connection, REQ_SIZE - struct.calcsize(VCC_RELAY_HEADER_FORMAT))
                json_msg = bytes_to_json(raw_msg)
            await websocket.send(json_msg)
    except asyncio.CancelledError:
        pass
    except socket.gaierror:
        cancel_func()
    except Exception as e:
        logging.info(e)
        cancel_func()


async def send_loop(websocket, connection: socket.SocketType, cancel_func):
    loop = asyncio.get_event_loop()
    try:
        while True:
            json_msg = await websocket.recv()
            raw_msg = json_to_bytes(json_msg)
            await loop.sock_sendall(connection, raw_msg)
    except asyncio.CancelledError:
        pass
    except TypeError as e:
        cancel_func()
    except websockets.ConnectionClosedOK as e:
        cancel_func()
    except Exception as e:
        logging.info(e)
        cancel_func()

async def loop(websocket):
    loop = asyncio.get_event_loop()
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setblocking(False)
    sock.bind(("0.0.0.0", 0))
    await loop.sock_connect(sock, ("124.223.105.230", 46))
    send_loop_task: asyncio.Task[None]
    recv_loop_task: asyncio.Task[None]
    cancel_func = lambda: (
        send_loop_task.cancel(),
        recv_loop_task.cancel()
    )
    remote_ip = websocket.remote_address[0]
    logging.info(f"{remote_ip} connected")
    try:
        send_loop_task = asyncio.create_task(send_loop(websocket, sock, cancel_func))
        recv_loop_task = asyncio.create_task(recv_loop(websocket, sock, cancel_func))
        await asyncio.gather(send_loop_task, recv_loop_task)
    finally:
        sock.shutdown(socket.SHUT_RDWR)
        sock.close()

async def main():
    logging.basicConfig(level=logging.INFO)
    async with websockets.serve(loop, "", 7000):
        logging.info("started: ws://localhost:7000")
        await asyncio.Future()

uvloop.install()
asyncio.run(main())