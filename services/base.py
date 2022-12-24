import json
import logging

from twisted.internet import task
from twisted.internet.defer import Deferred
from twisted.internet.protocol import ClientFactory, Protocol

log = logging.getLogger(__name__)
log.addHandler(logging.NullHandler())

class Service(Protocol):
    def __init__(self, factory):
        self.factory = factory

    def send(self, obj):
        self.transport.write(bytes(json.dumps(obj), "UTF8"))

    def connectionMade(self):
        self.send({"type": "handshake", "role": "service", "services": list(self.factory.services.keys())})

    def dataReceived(self, data):
        try:
            data = json.loads(data)
            log.debug(data)
        except json.JSONDecodeError:
            self.send({"res":"error","error":"not json"})
            return
        if "res" in data:
            return
        if data["type"] == "call":
            log.debug(1)
            func = self.factory.services[data["service"]]
            resp = func(**data["data"])
            self.send({"type": "respond", "data": resp, "jobid": data["jobid"]})


class RpcServiceFactory(ClientFactory):
    def buildProtocol(self, addr):
        return Service(self)

    def __init__(self,services):
        self.services = services
        self.done = Deferred()

    def clientConnectionFailed(self, connector, reason):
        log.debug(reason)
        self.done.errback(reason)

    def clientConnectionLost(self, connector, reason):
        log.debug(reason)
        self.done.callback(None)

class RpcServer:
    def __init__(self):
        self._fields = {}

    def register(self, instance):
        self._fields.update({i: getattr(instance, i) for i in dir(instance) if i[0] != "_"})

    def connect(self, protocol="tcp", port=2474):
        def main(reactor):
            factory = RpcServiceFactory(self._fields)
            reactor.connectTCP("localhost", port, factory)
            return factory.done

        task.react(main)
        
