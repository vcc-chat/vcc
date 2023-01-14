import asyncio
import json
import functools
import os
import logging
import threading
import traceback

from twisted.internet import task
from twisted.internet.defer import Deferred
from twisted.internet.protocol import ClientFactory
from twisted.protocols.basic import LineReceiver

log = logging.getLogger(__name__)
log.addHandler(logging.NullHandler())


class ServiceExport:
    def __init__(self, func=None, async_mode=False):
        self.async_mode = async_mode
        if func is None:
            self.func = None
            return
        self.func = func

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
        print(dct | {"exports": exports, "exports_async": exports_async})
        if exports != {} or exports_async != {}:
            dct = dct | {"exports": exports, "exports_async": exports_async}
        return type(clsname, bases, dct)


class Service(LineReceiver):
    def __init__(self, factory):
        self.factory: RpcServiceFactory = factory

    def send(self, obj):
        self.sendLine(bytes(json.dumps(obj), "UTF8"))

    def connectionMade(self):
        self.send(
            {
                "type": "handshake",
                "role": "service",
                "name": self.factory.name,
                "services": self.factory.services,
            }
        )

    async def a_do_request(self, data):
        service = data["service"]
        func = self.factory.funcs[service]
        param=data["data"]
        # FIXME:Dont do the fucking param check and the code will work
        # if len(param.keys())!=getattr(func,"__code__",func).co_argcount-1:
        #     self.send({"res": "error", "error": "wrong format","jobid": data["jobid"]})
        #     return
        try:  # FIXME: This try-except may make debug hard
            if service in self.factory.async_func:
                resp = await func(**data["data"])
            else:
                resp = await self.factory.eventloop.run_in_executor(
                    None, lambda: func(**data["data"])
                )
            self.send({"type": "respond", "data": resp, "jobid": data["jobid"]})
        except Exception as e:
            traceback.print_exc()
            self.send({"res": "error", "error": "server error","data":traceback.format_exc(),"jobid": data["jobid"]})

    def lineReceived(self, data):
        try:
            data = json.loads(data)
            log.debug(data)
        except json.JSONDecodeError:
            self.send({"res": "error", "error": "not json"})
            return
        if "res" in data:
            return
        if data["type"] == "call":
            asyncio.run_coroutine_threadsafe(
                self.a_do_request(data), self.factory.eventloop
            )


class RpcServiceFactory(ClientFactory):
    def __init__(self, name, async_mode=False):
        self.name = name
        self.eventloop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.eventloop)
        self.async_mode = async_mode
        self.services = {}
        self.funcs = {}
        self.done = Deferred()
        # threading._start_new_thread(self.eventloop.run_until_complete, (self.loop(),))
        threading._start_new_thread(self.eventloop.run_forever, ())

    def buildProtocol(self, addr):
        return Service(self)

    def clientConnectionFailed(self, connector, reason):
        log.debug(reason)
        self.done.errback(reason)

    def clientConnectionLost(self, connector, reason):
        log.debug(reason)
        self.done.callback(None)

    def register(self, instance):
        self.instance = instance
        if hasattr(instance, "exports") or hasattr(instance, "exports_async"):
            services = {
                i: getattr(instance, i)
                for i in (
                    getattr(instance, "exports", [])
                    + getattr(instance, "exports_async", [])
                )
                if i[0] != "_" and hasattr(getattr(instance, i), "__call__")
            }
            self.async_func = getattr(instance, "exports_async", [])
        else:
            services = {
                i: getattr(instance, i)
                for i in dir(instance)
                if i[0] != "_" and hasattr(getattr(instance, i), "__call__")
            }
            if self.async_mode:
                self.async_func = list(services.keys())
            else:
                self.async_func = []
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

    def get_host(self) -> tuple[str, int]:
        if "RPCHOST" in os.environ:
            host = os.environ["RPCHOST"].split(":")
            return host[0], int(host[1])
        else:
            return ("localhost", 2474)

    async def loop(self):
        while 1:
            asyncio.Future

    def connect(self, host=None, port=None):
        if host is None and port is None:
            host, port = self.get_host()

        def main(reactor):
            reactor.connectTCP(host, port, self)
            return self.done

        task.react(main)
