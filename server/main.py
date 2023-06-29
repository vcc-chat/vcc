import asyncio

from vcc import service
from vcc.service import request_context
from vcc.service import ServiceExport as export

class rpc():
    def __init__(self,factory:service.RpcServiceFactory):
        self.factory=factory
    def register(self,namespace:list):
        service=request_context.Service
        if type(namespace)==str:
            self.factory.services[namespace]=service
            return
        for i in namespace:
            self.factory.services[i]=service

if __name__=="__main__":
    server=service.RpcServiceFactory()
    server.register(rpc(server))
    asyncio.run(server.alisten())
