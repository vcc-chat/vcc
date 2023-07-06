import asyncio
import service


class rpc:
    def aaa(self):
        pass

server=service.RpcServiceFactory()
server.register(rpc())

asyncio.run(server.alisten())
