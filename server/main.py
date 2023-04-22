import json
import uuid
import sys
import os
import traceback
from functools import reduce
from itertools import zip_longest
from twisted.internet import protocol, reactor, endpoints
from twisted.protocols.basic import LineReceiver


class RpcProtocol(LineReceiver):
    def __init__(self, factory):
        self.factory: RpcServer = factory
        self.name = None

    def send(self, data):
        self.sendLine(bytes(json.dumps(data), "UTF8"))

    def lineReceived(self, data):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            self.send({"res": "error", "error": "not json"})
            return
        if "res" in data:
            if data["res"] == "error" and self.role == "service":
                self.factory.make_respond(data["jobid"], data["error"], error=True)
            return
        match data.get("type"):
            case "handshake":
                self.do_handshake(data)
            case "respond" if self.role == "service":
                self.factory.make_respond(data["jobid"], data["data"])
            case "request":
                self.factory.make_request(
                    self, data["service"], data["data"], data["jobid"]
                )
            case _:
                self.send(
                    {"res": "error", "error": "invalid request", "jobid": data["jobid"]}
                )
                return

    def do_handshake(self, data):
        self.role = data["role"]
        if data["role"] == "service":
            self.name = data["name"]
            self.factory.services[self.name] = data["services"]
            master = False
            if self.name not in self.factory.providers:
                self.factory.providers[self.name] = []
                master = True
            self.factory.providers[self.name].append(self)
            self.send({"res": "ok", "master": master})
            return
        self.send({"res": "ok"})

    def make_request(self, service, data, jobid):
        data = {"type": "call", "service": service, "data": data, "jobid": jobid}
        self.send(data)

    def make_respond(self, jobid, data, error):
        data = {"type": "resp", "data": data, "jobid": jobid} | (
            {"error": error} if error else {}
        )
        self.send(data)

    def connectionLost(self, reason):
        if self.role == "service":
            self.factory.providers[self.name].remove(self)
            if self.factory.providers[self.name]==[]:
                del self.factory.providers[self.name]
                return
            self.factory.lb_seq[self.name] = 0


class BuiltinService:
    def __init__(self, factory, functions: dict, name: str = "rpc"):
        self.factory = factory
        self.factory.providers[name] = [self]
        self.functions = functions
        self.factory.services[name] = {key: {} for key in self.functions.keys()}

    def make_request(self, service, data, jobid):
        self.factory.make_respond(jobid, self.functions[service](**data))

class RpcServer(protocol.Factory):
    services = {}  # map providers to services
    providers = {}  # map service name to actual instance
    promises = {}
    lb_seq = {}  # map service name to load balence seq

    def list_providers(self) -> list:

        return list(self.providers.keys())

    def list_services(self, name) -> list:
        return list(self.services[name].keys())

    def __init__(self):
        super()
        self.builtin_service = BuiltinService(
            self,
            {
                "list_providers": self.list_providers,
                "list_services": self.list_services,
            },
        )

    def make_request(self, client: RpcProtocol, service, data: dict, jobid: str):
        service = service.split("/")
        if (
            service[0] not in self.services
            or service[1] not in self.services[service[0]]
        ):
            client.send({"res": "error", "error": "no such service", "jobid": jobid})
        try:
            if self.services[service[0]][service[1]]:
                # valid: bool = reduce(
                #     lambda a, b: a
                #     and b[0][0] == b[1][0]
                #     and (
                #         b[0][1] == type(b[1][1]).__name__
                #         or b[0][1] == "Any"
                #         or b[0][1] == "typing.Any"
                #     ),
                #     zip_longest(
                #         *[
                #             sorted(c.items())
                #             for c in [self.services[service[0]][service[1]], data]
                #         ]
                #     ),
                #     True,
                # )
                valid = True
                if not valid:
                    raise TypeError("invalid request data type")
            self.promises[jobid] = client
        except:
            traceback.print_exc()
            client.send({"res": "error", "error": "unknown error", "jobid": jobid})
        else:
            service_name = service[0]
            providers = self.providers[service_name]
            try:
                provider = providers[self.lb_seq.get(service_name, 0)]
            except IndexError:
                provider = providers[0]
            provider.make_request(service[1], data, jobid)
            self.lb_seq[service_name] = (
                self.lb_seq.get(service_name, 0) + 1
                if self.lb_seq.get(service_name, 0) < len(providers) - 1
                else 0
            )

    def make_respond(self, jobid, data, error=False):
        self.promises[jobid].make_respond(jobid, data, error)
        del self.promises[jobid]

    def buildProtocol(self, addr):
        return RpcProtocol(self)


if __name__ == "__main__":
    host, port = os.getenv("RPCHOST", "127.0.0.1:2474").split(":")
    endpoints.serverFromString(reactor, f"tcp:{port}:interface={host}").listen(
        RpcServer()
    )
    reactor.run()
