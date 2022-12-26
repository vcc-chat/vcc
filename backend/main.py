from typing import NamedTuple

import asyncio
import socket
import json
import logging
import redis.asyncio as redis

import websockets
import uvloop

from vcc import RpcExchanger, RpcExchangerClient

async def recv_loop(websocket, client: RpcExchangerClient) -> None:
    try:
        while True:
            username, msg, chat = await client.recv()
            logging.debug(f"{username=} {msg=} {chat=}")
            json_msg = json.dumps({
                "type": 2,
                "uid": chat,
                "usrname": username,
                "msg": msg
            })
            await websocket.send(json_msg)
    except asyncio.CancelledError:
        pass
    except socket.gaierror:
        pass
    except Exception as e:
        logging.info(e)
        raise


async def send_loop(websocket, client: RpcExchangerClient) -> None:
    try:
        async for json_msg in websocket:
            json_result = json.loads(json_msg)
            if json_result["type"] == 4:
                login_result = await client.login(json_result["usrname"], json_result["msg"])
                await websocket.send(json.dumps({
                    "type": 4,
                    "uid": int(login_result),
                    "usrname": "",
                    "msg": ""
                }))
                if login_result is not None:
                    await client.chat_join(1)
            else:
                await client.send(json_result["msg"], json_result["uid"])
    except TypeError:
        pass
    except websockets.ConnectionClosedOK:
        pass
    except Exception as e:
        logging.info(e)

async def loop(websocket, exchanger: RpcExchanger):
    send_loop_task: asyncio.Task[None]
    recv_loop_task: asyncio.Task[None]
    remote_ip = websocket.remote_address[0]
    logging.info(f"{remote_ip} connected")
    async with exchanger.create_client() as client:
        send_loop_task = asyncio.create_task(send_loop(websocket, client))
        recv_loop_task = asyncio.create_task(recv_loop(websocket, client))
        await asyncio.gather(send_loop_task, recv_loop_task)

async def main():
    logging.basicConfig(level=logging.DEBUG)
    async with RpcExchanger() as exchanger:
        async with websockets.serve(lambda ws: loop(ws, exchanger), "", 7000):
            logging.info("started: ws://localhost:7000")
            await asyncio.Future()

uvloop.install()
asyncio.run(main())
