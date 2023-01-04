import json
import os
import logging

from twisted.internet import task
from twisted.internet.defer import Deferred
from twisted.internet.protocol import ClientFactory
from twisted.protocols.basic import LineReceiver

log = logging.getLogger(__name__)
log.addHandler(logging.NullHandler())


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
            log.debug(1)
            func = self.factory.funcs[data["service"]]
            try:
                resp = func(**data["data"])
                self.send({"type": "respond", "data": resp, "jobid": data["jobid"]})
            except TypeError:
                self.send({"res": "error", "error": "wrong format"})


class RpcServiceFactory(ClientFactory):
    def __init__(self,name):
        self.name=name
        self.services = {}
        self.funcs = {}
        self.done = Deferred()

    def buildProtocol(self, addr):
        return Service(self)

    def clientConnectionFailed(self, connector, reason):
        log.debug(reason)
        self.done.errback(reason)

    def clientConnectionLost(self, connector, reason):
        log.debug(reason)
        self.done.callback(None)

    def register(self, instance):
        services={i: getattr(instance, i) for i in dir(instance) if i[0] != "_"}
        annotations={key1: {
            key2: str(value2) if str(value2)[0] != "<" else value2.__name__ 
            for key2, value2 in value1.__annotations__.items() if key2 != "return"
        } for key1, value1 in services.items()}
        self.services.update(annotations)
        self.funcs.update(services)
    
    def get_host(self) -> tuple[str, int]:
        if "RPCHOST" in os.environ:
            host=os.environ["RPCHOST"].split(":")
            return host[0], int(host[1])
        else:
            return ("localhost",2474)
    def connect(self, host=None, port=None):
        if host is None and port is None:
            host, port = self.get_host()
        def main(reactor):
            reactor.connectTCP(host, port, self)
            return self.done
        task.react(main)
