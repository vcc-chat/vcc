import service
import asyncio

s=service.RpcServiceFactory()
s.register(type("a",(),{"hello":lambda x:"hello"})())
s.connect()
async def main():
    await s.aconnect()
    await asyncio.Future()
asyncio.run(main())
