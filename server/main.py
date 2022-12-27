import json
import uuid
import sys
import traceback
from functools import reduce
from itertools import zip_longest
from twisted.internet import protocol, reactor, endpoints


class RpcProtocol(protocol.Protocol):
    def __init__(self, factory):
        self.factory: RpcServer = factory
        self.name=None
    def send(self, data):
        self.transport.write(bytes(json.dumps(data), "UTF8"))

    def dataReceived(self, data):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            self.send({"res": "error","error": "not json"})
            return
        if "res" in data:
            return
        match data["type"]:
            case "handshake":
                self.do_handshake(data)
            case "respond" if self.role == "service":
                self.factory.make_respond(data["jobid"], data["data"])
            case "request" if self.role == "client":
                try:
                    self.factory.make_request(
                        self, data["service"], data["data"], data["jobid"]
                    )
                    ret = "ok"
                except (KeyError, TypeError) as e:
                    print(e)
                    ret = "err"

                ret = {"res": ret, "next_jobid": str(uuid.uuid4())}
                self.send(ret)
            case _:
                self.send({"res": "error", "error": "invalid request"})
                return
    def do_handshake(self, data):
        self.role=data["role"]
        if data["role"] == "client":
            initial_jobid = uuid.uuid4()
            self.send({"res": "ok", "initial_jobid": str(initial_jobid)})
        elif data["role"] == "service":
            self.name=data['name']
            self.factory.services[self.name]=data["services"]
            self.factory.providers[self.name]=self
            self.send({"res": "ok"})

    def make_request(self, service, data, jobid):
        data = {"type": "call", "service": service, "data": data, "jobid": jobid}
        self.send(data)

    def make_respond(self, jobid, data):
        data = {"type": "resp", "data": data, "jobid": jobid}
        self.send(data)


class RpcServer(protocol.Factory):
    services = {}
    providers = {}
    promises = {}

    def make_request(self, client:RpcProtocol, service:str, data:dict, jobid:str):
        service=service.split("/")
        try:
            # verify type
            valid: bool = reduce(
                lambda a, b: a and b[0][0] == b[1][0] and b[0][1] == type(b[1][1]).__name__,
                zip_longest(*[sorted(c.items()) for c in [self.services[service[0]][service[1]], data]]), True,
            )
            if not valid:
                raise TypeError("Invalid request data type")
            self.providers[service[0]].make_request(service[1], data, jobid)
        except KeyError as e:
            print(traceback.format_exc())
            raise KeyError("No such service")
        self.promises[jobid] = client

    def make_respond(self, jobid, data):
        self.promises[jobid].make_respond(jobid, data)
        del self.promises[jobid]

    def buildProtocol(self, addr):
        return RpcProtocol(self)


endpoints.serverFromString(reactor, "tcp:2474:interface=127.0.0.1").listen(RpcServer())
reactor.run()
