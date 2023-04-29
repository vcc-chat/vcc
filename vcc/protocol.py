import asyncio
import json
import uuid
from typing import *
from .tools import *

class RpcClientProtocol(asyncio.Protocol):
    def connection_made(self, transport: asyncio.Transport) -> None:
        self.transport = transport
        self.buffer = ""
        self.futures: dict[str, asyncio.Future] = {}
        self.transport.write(b'{"type": "handshake","role": "client"}\r\n')

    def data_received(self, data: bytes) -> None:
        datas = data.split("\r\n")
        datas[0] = self.buffer + datas[0]
        self.buffer = datas.pop()
        for i in datas:
            self.line_received(i)

    def line_received(self, data_bytes: bytes) -> None:
        data = json.loads(data_bytes)
        if "res" in data:
            return
        future = self.futures[data["jobid"]]
        if "error" in data:
            match data["error"]:
                case "no such service":
                    future.set_exception(RpcException("no such service"))
                case "invalid request data type":
                    future.set_exception(TypeError("invalid request data type"))
                case "wrong format":
                    future.set_exception(TypeError("wrong format"))
                case _:
                    future.set_exception(UnknownError)
        else:
            future.set_result(data["data"])

    async def rpc_request(self, service: str, data: dict[str, Any]) -> Any:
        log.debug(f"{service=} {data=}")
        new_uuid = str(uuid.uuid4())
        self.transport.write(json.dumps({
            "type": "request",
            "service": service,
            "data": data,
            "jobid": new_uuid
        }).encode() + b"\r\n")
        future = asyncio.Future[Any]()
        self._futures[new_uuid] = future
        result = await future
        log.debug(f"{result=}")
        return result
        
async def build_protocol():
    loop = asyncio.get_running_loop()
    host, port = get_host()
    transport, protocol = await loop.create_connection(RpcClientProtocol, host, port)
    return protocol