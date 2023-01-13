import functools
import asyncio
import os
import time

import base
from base import ServiceExport as export
import vcc
import redis.asyncio as redis
import aiohttp


def timer(interval, func=None):
    if func == None:
        return functools.partial(timer, interval)

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        while 1:
            await func(*args, **kwargs)
            await asyncio.sleep(interval)

    return wrapper


class Record(metaclass=base.ServiceMeta):
    async def record_worker(self):
        async for i in self._pubsub.listen():
            if i["type"] == "pmessage":
                channel = i["channel"].decode().split(":")[1]
                await self._redis.lpush("record:" + channel, i["data"].decode())
                await self._redis.set("recordl:" + channel,
                    (int((await self._redis.get("recordl:" + channel) or 0)) + len(i["data"]))
                )

    @timer(2)
    async def flush_worker(self):
        curser = 0
        while 1:
            curser, keys = await self._redis.scan(
                cursor=curser, match="record:*", count=1
            )
            list(map(lambda x: asyncio.create_task(self.do_flush(x)), keys))
            if curser == 0:
                break

    async def do_flush(self, key):
        length = await self._redis.llen(key)
        key = key.decode()
        filename = key.replace(":", "")+"-"+str(int(time.time()))
        file = await self._vcc.rpc.file.new_object(
            name=filename, id=filename, bucket="record"
        )

        async def data_generator():
            for i in range(length):
                data=(await self._redis.rpop(key))+b"\n"
                yield data

        async with aiohttp.ClientSession() as session:
            res = await session.put(
                url=file[0],
                data=data_generator(),
                headers={"Content-Length": (await self._redis.get(key.replace("d", "dl"))).decode()},# record:x -> recordl:x
            )

            await self._redis.set(key.replace("d", "dl"),0)

    async def _ainit(self):
        await self._vcc.__aenter__()
        await self._pubsub.psubscribe("messages:*")
        asyncio.get_event_loop().create_task(self.record_worker())
        return await self.flush_worker()
    @export(async_mode=True)
    async def hello(self):
        print("hello")
        return "hello world"
    def __init__(self):
        self._vcc = vcc.RpcExchanger()
        self._redis = redis.Redis.from_url(
            os.environ.get("REDIS_URL", "redis://localhost")
        )
        self._pubsub = self._redis.pubsub()
        asyncio.get_event_loop().create_task(self._ainit())


if __name__ == "__main__":
    server = base.RpcServiceFactory("record", async_mode=True)
    server.register(Record())
    asyncio.set_event_loop(server.eventloop)

    server.connect()
