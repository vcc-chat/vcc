import service
import asyncio
async def main():
    
    s=service.RpcServiceFactory()
    #s.register(type("a",(),{"hello":lambda x:"hello"})())
    await s.aconnect()
    while 1:
        print(1)
        try:
            print(await s.services.a.hello())
        except:
            pass
        print(2)
        await asyncio.sleep(1)
asyncio.run(main())
