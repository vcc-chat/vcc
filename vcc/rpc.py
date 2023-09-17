import asyncio

import service
from service import request_context
from service import ServiceExport as export

class rpc():
    def __init__(self,factory:service.RpcServiceFactory):
        self.factory=factory
    def register(self,namespace:list):
        svc=request_context.Service
        if type(namespace)==str:
            self.factory.services[namespace]=service.RemoteExport(svc,namespace)
            return
        for i in namespace:
            self.factory.services[i]=service.RemoteExport(svc,i)
        print(self.factory.services)
    def list_providers(self):
        return list(self.factory.services.keys())
if __name__=="__main__":
    server=service.RpcServiceFactory()
    server.register(rpc(server))
    asyncio.run(server.alisten())
