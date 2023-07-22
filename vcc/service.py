from __future__ import annotations
import os
import asyncio
import inspect
import json
import functools
import typing
import logging
import traceback
import enum
import uuid

try:
    from . import tools
except ImportError:
    import tools
# from twisted.internet import task ### No more twisted
# from twisted.internet.defer import Deferred
# from twisted.internet.protocol import ClientFactory
# from twisted.protocols.basic import LineReceiver
call_verbose = bool(os.getenv("VCC_CALL_VERBOSE"))
log = logging.getLogger(__name__)
log.addHandler(logging.NullHandler())
RpcServiceRole = enum.Enum("RpcServiceRole", ["SERVER", "CLIENT"])
request_context = tools.ContextObject()


class ServiceExport:
    def __init__(self, func=None, async_mode=False, thread=False, instance=None):
        self.instance = instance
        self.async_mode = async_mode
        self.thread = thread
        if func is None:
            self.func: typing.Callable[..., typing.Any] = typing.cast(typing.Any, None)
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
        if self.instance:
            args = (self.instance,) + args
        if self.async_mode:
            return self.func(*args, **kwargs)
        if self.thread:
            return asyncio.get_running_loop().run_in_executor(
                None, lambda: self.func(*args, **kwargs)
            )
        future = asyncio.Future()
        future.set_result(self.func(*args, **kwargs))
        return future

    def __get__(self, instance, _):
        self.instance = instance
        return self


class RemoteExport:
    def __init__(self, service: Service, namespace: str):
        self.service = service
        self.namespace = namespace
        self.connection = []
        self.alive = 0

    def add_connection(self, connection: Service):
        self.connection.append(connection)
        self.alive += 1

    def __getitem__(self, name):
        return lambda **x: self.service.call(self.namespace, name, x)


class SuperService:
    pass


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

    def connection_made(self, transport: asyncio.Transport) -> None:
        self.transport = transport

    def data_received(self, data: bytes) -> None:
        datas = data.split(b"\r\n")
        datas[0] = self.line_buffer + datas[0]
        self.line_buffer = datas.pop()
        for i in datas:
            self.line_received(i.decode())

    def sendLine(self, data):
        self.transport.write(data + b"\r\n")

    def line_received(self, data):
        pass


class Service(lineReceiver):
    def __init__(self, factory, role):
        self.factory: RpcServiceFactory = factory
        self.role = role
        self.jobs: dict[str, asyncio.Future] = {}

    def send(self, **obj):
        self.sendLine(bytes(json.dumps(obj), "UTF8"))

    def connection_made(self, transport):
        self.transport = transport
        if self.role == RpcServiceRole.SERVER:
            if "rpc" in self.factory.services:
                capacity = list(self.factory.services["rpc"].keys())
            else:
                capacity = []
            self.send(type="connect", capacity=capacity)
        else:
            self.factory.connections.append(self)

    def connection_lost(self, exc: Exception | None):
        if self.role == RpcServiceRole.CLIENT:
            self.factory.on_con_lost.set_result(True)

    async def call(self, namespace, service, kwargs):
        log.debug(f"Request to rpc: {namespace=} {service=} {kwargs=}")
        jobid = str(uuid.uuid4())
        future = asyncio.Future()
        self.jobs[jobid] = future
        if call_verbose:
            print(f"Call {namespace}.{service}({kwargs}) with jobid {jobid}")
        self.send(
            type="call", jobid=jobid, namespace=namespace, service=service, data=kwargs
        )
        ret = await future
        del self.jobs[jobid]
        return ret

    async def a_do_request(self, data):
        service = data["service"]
        namespace = data["namespace"]
        if call_verbose:
            print(
                f'Call {namespace}.{service}({data["data"]}) with jobid {data["jobid"]}'
            )
        request_context.Service = self
        try:
            func = self.factory.services[namespace][service]
        except KeyError:
            self.send(
                res="error",
                error=f"no such service {namespace}.{service}",
                data=None,
                jobid=data["jobid"],
            )
            return

        # FIXME:Dont do the fucking param check and the code will work
        # if len(param.keys())!=getattr(func,"__code__",func).co_argcount-1:
        #     self.send({"res": "error", "error": "wrong format","jobid": data["jobid"]})
        #     return
        try:  # FIXME: This try-except may make debug hard
            resp = await func(**data["data"])
            self.send(type="respond", data=resp, jobid=data["jobid"])
        except Exception:
            traceback.print_exc()
            self.send(
                res="error",
                error="server error",
                data=traceback.format_exc(),
                jobid=data["jobid"],
            )

    def make_respond(self, jobid, data):
        try:
            self.jobs[jobid].set_result(data)
        except:
            return

    def line_received(self, data):
        try:
            data = json.loads(data)
            log.debug(data)
        except json.JSONDecodeError:
            self.send(res="error", error="not json")
            return
        if "res" in data:
            return
        match data.get("type", None):
            case "call":
                asyncio.create_task(self.a_do_request(data))
            case "connect":
                if self.role == RpcServiceRole.CLIENT:
                    if "register" in data["capacity"]:
                        print(self.factory.services.rpc)
                        asyncio.get_running_loop().create_task(
                            self.factory.services.rpc.register(
                                namespace=list(self.factory.services.keys())
                            )
                        )
            case "respond":
                self.make_respond(data["jobid"], data["data"])


class ServiceTable(dict):
    def __init__(self, factory):
        self.factory = factory

    def _get(self, name):
        if name in self:
            return self.get(name)
        if self.factory.superservice and request_context.Service != (
            superservice := self.factory.superservice
        ):
            superservice: Service = self.factory.superservice
            return type(
                name,
                (),
                {
                    "__getitem__": lambda self, n: functools.partial(
                        superservice.send, name, n
                    ),
                    "__getattr__": lambda self, n: lambda **x: superservice.call(
                        name, n, x
                    ),
                },
            )()
        raise KeyError()

    def __getitem__(self, name):
        return self._get(name)

    def __setitem__(self, name, value):
        dict.__setitem__(self, name, value)

    def __getattr__(self, name):
        if name in dir(self):
            return object.__getattribute__(self, name)
        return self._get(name)


class RpcServiceFactory:
    superservice: Service | None = typing.cast(
        typing.Any,
        property(
            lambda self: tools.list_get_default(self.connections, 0)
            if len(self.connections)
            else None
        ),
    )

    def __init__(self):
        self.services = ServiceTable(self)
        self.connections = []
        # service={<namespace>:{<service>:[<annotations>,<ServiceExport>/<RemoteExport>]}}

    # def clientConnectionFailed(self, connector, reason):
    #     log.debug(reason)
    #     self.done.errback(reason)
    #
    # def clientConnectionLost(self, connector, reason):
    #     log.debug(reason)
    #     self.done.callback(None)

    @staticmethod
    def create_meta_info(func_map: dict[str, typing.Callable[..., typing.Any]]):
        return {
            key: {
                "params": [
                    param.name
                    for param in inspect.signature(func).parameters.values()
                ],
                "alias": getattr(func, "alias", []),
                "auth_required": getattr(func, "auth_required", True)
            }
            for key, func in [(key, (value.func if isinstance(value, ServiceExport) else value)) for key, value in func_map.items()]
        }

    def register(self, instance, name=None, async_mode=False):
        if name is None:
            name = type(instance).__name__.lower()
        if hasattr(instance, "exports") or hasattr(instance, "exports_async"):
            func = {
                i: getattr(instance, i)
                for i in (
                    getattr(instance, "exports", [])
                    + getattr(instance, "exports_async", [])
                )
                if i[0] != "_" and callable(getattr(instance, i))
            }
        else:
            func = {
                i: ServiceExport(getattr(instance, i), async_mode=async_mode)
                for i in dir(instance)
                if i[0] != "_" and callable(getattr(instance, i))
            }

        meta_info = self.create_meta_info(func)

        def get_meta_info(): return meta_info

        func["get_meta_info"] = get_meta_info # type: ignore
        
        annotations = {
            key1: {
                key2: str(value2) if str(value2)[0] != "<" else value2.__name__
                for key2, value2 in value1.__annotations__.items()
                if key2 != "return"
            }
            for key1, value1 in func.items()
        }
        self.services.update({name: func})
        # self.funcs.update(services)

    async def aconnect(self, host=tools.get_host(), retry=0):
        if retry > 10:
            return
        loop = asyncio.get_running_loop()
        print(host)
        self.on_con_lost = loop.create_future()
        transport, protocol = await loop.create_connection(
            functools.partial(Service, self, RpcServiceRole.CLIENT), *host
        )
        await self.on_con_lost
        await asyncio.sleep(2)
        return await self.aconnect(host, retry + 1)

    async def alisten(self, host=tools.get_host()):
        self.role = RpcServiceRole.SERVER
        loop = asyncio.get_running_loop()
        return await (
            await loop.create_server(
                functools.partial(Service, self, RpcServiceRole.SERVER), *host
            )
        ).serve_forever()

    def connect(self, *args, **kwargs):
        asyncio.run(self.aconnect(*args, **kwargs))

# Following are some decorators

def metadata(*, auth_required: bool = True, alias: str | list[str]):
    def func(func):
        func.auth_required = auth_required
        func.alias = alias if isinstance(alias, list) else [alias]
        return func
    return func
