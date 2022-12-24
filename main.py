import json
import uuid
from twisted.internet import protocol, reactor, endpoints


class RpcProtocol(protocol.Protocol):
    def __init__(self, factory):
        print(1)
        self.factory: EchoFactory = factory

    def connectionLost(self,res):
        if self.role=="client":
            self.factory.clients.remove(self)
        return
    def dataReceived(self, data):
        try:
            data = json.loads(data)
            print(data)
        except json.JSONDecodeError:
            self.transport.write(b'{"res":"error","error":"not json"}')
            return
        if "res" in data:
            return
        if data["type"] == "handshake":
            self.do_handshake(data)
            print(self.factory.services)
        if self.role!="service" and self not in self.factory.clients:
            self.transport.write(b'{"res":"error","error":"invalid request"}')
            return
        if data["type"] == "respond":
            self.factory.make_respond(data["jobid"], data["data"])

        if data["type"] == "request":
            try:
                self.factory.make_request(
                    self, data["service"], data["data"], data["jobid"]
                )
                ret="ok"
            except KeyError:
                ret="err"

            ret = {"res": ret, "next_jobid": str(uuid.uuid4())}
            self.transport.write(bytes(json.dumps(ret), "UTF8"))
    def do_handshake(self, data):
        self.role=data["role"]
        if data["role"] == "client":
            self.role = "client"
            self.factory.clients.append(self)
            initial_jobid = uuid.uuid4()
            self.transport.write(
                bytes(
                    json.dumps({"res": "ok", "initial_jobid": str(initial_jobid)}),
                    "UTF8",
                )
            )
            return
        if data["role"] == "service":
            self.role = "service"
            for i in (serv := data["services"]):
                self.factory.services[i] = self
            self.transport.write(b'{"res":"ok"}')
            return

    def make_request(self, service, data, jobid):
        data = {"type": "call", "service": service, "data": data, "jobid": jobid}
        self.transport.write(bytes(json.dumps(data), "UTF8"))
        return

    def make_respond(self, jobid, data):
        data = {"type": "resp", "data": data, "jobid": jobid}
        self.transport.write(bytes(json.dumps(data), "UTF8"))


class RpcServer(protocol.Factory):
    services = {}
    clients = []
    promises = {}

    def make_request(self, client, service, data, jobid):
        try:
            self.services[service].make_request(service, data, jobid)
        except KeyError:
            raise KeyError("Not such service")
        self.promises[jobid] = client

    def make_respond(self, jobid, data):
        self.promises[jobid].make_respond(jobid, data)
        del self.promises[jobid]

    def buildProtocol(self, addr):
        return RpcProtocol(self)


endpoints.serverFromString(reactor, "tcp:1234").listen(RpcServer())
reactor.run()
