import asyncio
import json
import functools
import os
import logging
import threading
import traceback
import inspect

import tools
# from twisted.internet import task ### No more twisted
# from twisted.internet.defer import Deferred
# from twisted.internet.protocol import ClientFactory
# from twisted.protocols.basic import LineReceiver

log = logging.getLogger(__name__)
log.addHandler(logging.NullHandler())


class ServiceExport:
    def __init__(self, func=None, async_mode=False, thread=True):
        self.async_mode = async_mode
        self.thread = thread
        if func is None:
            self.func = None
            return
        self.func = func
        self.__name__ = self.func.__name__
        self.__annotations__ = self.func.__annotations__
    def __call__(self, *args, **kwargs):
        if self.func is None:
            self.func = args[0]
            self.__name__ = self.func.__name__
            self.__annotations__ = self.func.__annotations__
            return self

    def __get__(self, instance, _):
        return type(
            self.func.__name__,
            (),
            {
                "thread": self.thread,
                "__call__": functools.partial(self.func, instance),
                "__annotations__": self.__annotations__,
                "co_argcount": self.func.__code__.co_argcount,
            },
        )()


class ServiceMeta(type):
    def __new__(cls, clsname, bases, dct):
        exports = []
        exports_async = []
        for i in dct:
            attr = dct[i]
            if isinstance(attr, ServiceExport):
                ([exports, exports_async][attr.async_mode]).append(attr.__name__)
        if exports != {} or exports_async != {}:
            dct |= {"exports": exports, "exports_async": exports_async}
        return type(clsname, bases, dct)


class lineReceiver(asyncio.Protocol):
    line_buffer = b""

    def connection_made(self, transport) -> None:
        self.transport = transport
        transport.write(b"1145141919810")

    def data_received(self, data: bytes) -> None:
        self.line_buffer += data
        if data.endswith(b"\n"):  ####
            print(self.line_buffer)
            self.line_received(self.line_buffer.decode())
            self.line_buffer = b""

    def sendLine(self, data):
        self.transport.write(data + b"\r\n")

    def line_received(self, data):
        pass


class Service(lineReceiver):
    def __init__(self, factory):
        self.factory: RpcServiceFactory = factory

    def send(self, obj):
        self.sendLine(bytes(json.dumps(obj), "UTF8"))

    def connection_made(self, transport):
        self.transport = transport
        self.send(
            {
                "type": "handshake",
                "role": "service",
                "name": self.factory.name,
                "services": self.factory.services,
            }
        )

    def connection_lost(self, exc: Exception | None):
        self.factory.on_con_lost.set_result(True)

    async def a_do_request(self, data):
        service = data["service"]
        func = self.factory.funcs[service]
        param = data["data"]
        # FIXME:Dont do the fucking param check and the code will work
        # if len(param.keys())!=getattr(func,"__code__",func).co_argcount-1:
        #     self.send({"res": "error", "error": "wrong format","jobid": data["jobid"]})
        #     return
        try:  # FIXME: This try-except may make debug hard
            if service in self.factory.async_func:
                resp = await func(**data["data"])
            else:
                if getattr(func, "thread", False):
                    resp = await asyncio.get_event_loop().run_in_executor(
                        None, lambda: func(**data["data"])
                    )
                else:
                    resp = func(**data["data"])
            self.send({"type": "respond", "data": resp, "jobid": data["jobid"]})
        except Exception as e:
            traceback.print_exc()
            self.send(
                {
                    "res": "error",
                    "error": "server error",
                    "data": traceback.format_exc(),
                    "jobid": data["jobid"],
                }
            )

    def line_received(self, data):
        try:
            data = json.loads(data)
            log.debug(data)
        except json.JSONDecodeError:
            self.send({"res": "error", "error": "not json"})
            return
        if "res" in data:
            return
        if data["type"] == "call":
            asyncio.create_task(self.a_do_request(data))


class RpcServiceFactory:
    def __init__(self, name, async_mode=False, eventloop=None):
        self.name = name
        self.async_mode = async_mode
        self.services = {}
        self.funcs = {}
        # threading._start_new_thread(self.eventloop.run_until_complete, (self.loop(),))
        # if not eventloop:
        #     self.eventloop = asyncio.new_event_loop()
        #     threading._start_new_thread(self.eventloop.run_forever, ())
        # else:
        #     self.eventloop=eventloop
        # asyncio.set_event_loop(self.eventloop)

    def buildProtocol(self):
        return Service(self)

    # def clientConnectionFailed(self, connector, reason):
    #     log.debug(reason)
    #     self.done.errback(reason)
    #
    # def clientConnectionLost(self, connector, reason):
    #     log.debug(reason)
    #     self.done.callback(None)

    def register(self, instance):
        self.instance = instance
        if hasattr(instance, "exports") or hasattr(instance, "exports_async"):
            services = {
                i: getattr(instance, i)
                for i in (
                    getattr(instance, "exports", [])
                    + getattr(instance, "exports_async", [])
                )
                if i[0] != "_" and callable(getattr(instance, i))
            }
            self.async_func = getattr(instance, "exports_async", [])
        else:
            services = {
                i: getattr(instance, i)
                for i in dir(instance)
                if i[0] != "_" and callable(getattr(instance, i))
            }
            self.async_func = [key for key, value in services.items() if self.async_mode]
        annotations = {
            key1: {
                key2: str(value2) if str(value2)[0] != "<" else value2.__name__
                for key2, value2 in value1.__annotations__.items()
                if key2 != "return"
            }
            for key1, value1 in services.items()
        }
        self.services.update(annotations)
        self.funcs.update(services)

    async def aconnect(self,host=tools.get_host(),retry=0):
        loop = asyncio.get_running_loop()
        self.on_con_lost = loop.create_future()
        transport, protocol = await loop.create_connection(
            self.buildProtocol, *host
        )
        await self.on_con_lost
        asyncio.sleep(2)
        return await self.aconnect(self,host,retry+1)
    def connect(self, *args, **kwargs):
        asyncio.run(self.aconnect(*args, **kwargs))
