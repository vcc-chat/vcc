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

class BuiltinService():
    def __init__(self,factory,functions:dict,name:str="rpc"):
        self.factory=factory
        self.factory.providers[name]=self
        self.functions=functions
        self.factory.services[name]={key:{} for key in self.functions.keys()}

    def make_request(self, service, data, jobid):
        self.factory.make_respond(jobid,self.functions[service]())
class RpcServer(protocol.Factory):
    services = {} # map providers to services
    providers = {} # map service name to actual instance
    promises = {}

    def list_providers(self) -> list:
        return list(self.providers.keys())
    def __init__(self):
        super()
        self.builtin_service=BuiltinService(self,{"list_providers":self.list_providers})
    def make_request(self, client:RpcProtocol, service:str, data:dict, jobid:str):
        service=service.split("/")
        try:
            # verify type
            if len(self.services[service[0]][service[1]])>0:
                valid: bool = reduce(
                    lambda a, b: a and b[0][0] == b[1][0] and b[0][1] == type(b[1][1]).__name__,
                    zip_longest(*[sorted(c.items()) for c in [self.services[service[0]][service[1]], data]]), True,
                )
                if not valid:
                    raise TypeError("Invalid request data type")
            self.promises[jobid] = client
            self.providers[service[0]].make_request(service[1], data, jobid)
        except KeyError as e:
            print(traceback.format_exc())
            raise KeyError("No such service")
    def make_respond(self, jobid, data):
        self.promises[jobid].make_respond(jobid, data)
        del self.promises[jobid]

    def buildProtocol(self, addr):
        return RpcProtocol(self)


endpoints.serverFromString(reactor, "tcp:2474:interface=127.0.0.1").listen(RpcServer())
reactor.run()
