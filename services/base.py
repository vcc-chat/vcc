import json
import logging

from twisted.internet import task
from twisted.internet.defer import Deferred
from twisted.internet.protocol import ClientFactory, Protocol

log = logging.getLogger(__name__)
log.addHandler(logging.NullHandler())


class Service(Protocol):
    def __init__(self, factory):
        self.factory: RpcServiceFactory = factory

    def send(self, obj):
        self.transport.write(bytes(json.dumps(obj), "UTF8"))

    def connectionMade(self):
        self.send(
            {
                "type": "handshake",
                "role": "service",
                "services": list(self.factory.services.keys()),
                "annotations": self.factory.annotations
            }
        )

    def dataReceived(self, data):
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
            func = self.factory.services[data["service"]]
            try:
                resp = func(**data["data"])
            except TypeError:
                self.send({"res": "error", "error": "wrong format"})
            self.send({"type": "respond", "data": resp, "jobid": data["jobid"]})


class RpcServiceFactory(ClientFactory):
    def __init__(self):
        self.services = {}
        self.annotations = {}
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
        self.services.update(
            {i: getattr(instance, i) for i in dir(instance) if i[0] != "_"}
        )
        self.annotations.update({key1: {
            key2: str(value2) if str(value2)[0] != "<" else value2.__name__ 
            for key2, value2 in value1.__annotations__.items() if key2 != "return"
        } for key1, value1 in self.services.items()})

    def connect(self, host="localhost", port=2474):
        def main(reactor):
            reactor.connectTCP(host, port, self)
            return self.done

        task.react(main)
