import functools
import asyncio
import os
import time
from typing import cast

from vcc.tools import RedisMessage

import base
from base import ServiceExport as export
import vcc
import redis.asyncio as redis
import aiohttp
import models
import peewee
import json
from models import *

db = get_database()

bind_model(User, db)
bind_model(Chat, db)
bind_model(Message, db)


def timer(interval, func=None):
    if func == None:
        return functools.partial(timer, interval)

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        await asyncio.sleep(interval - time.time() % interval)
        while 1:
            asyncio.create_task(func(*args, **kwargs))
            await asyncio.sleep(interval - time.time() % interval)

    return wrapper


class Record(metaclass=base.ServiceMeta):
    async def record_worker(self):
        async for raw_message in self._pubsub.listen():
            if raw_message["type"] == "message":
                self._messages.append(json.loads(raw_message["data"].decode()))

    @timer(5)
    async def flush_worker(self):
        messages = self._messages.copy()
        self._messages.clear()
        with db.atomic():
            await asyncio.get_running_loop().run_in_executor(
                None,
                lambda: Message.insert_many(
                    [
                        {
                            "user": msg["uid"],
                            "chat": msg["chat"],
                            "content": msg["payload"],
                            "time": msg["time"],
                            "type": msg["msg_type"],
                            "id": msg["id"],
                        }
                        for msg in messages
                        if "session" not in msg
                    ]
                ).execute(),
            )

    async def _ainit(self):
        await self._vcc.__aenter__()
        await self._pubsub.subscribe("messages")
        asyncio.get_event_loop().create_task(self.record_worker())
        return await self.flush_worker()

    @export(async_mode=True)
    async def query_record(self, chatid: int, time: int):
        if time > int(globals()["time"].time() * 1000):
            return []

        return await asyncio.get_running_loop().run_in_executor(
            None,
            lambda: [
                {"id": str(i["id"]), **i}
                for i in Message.select()
                .where(Message.chat == chatid & Message.time >= time)
                .dicts()
            ],
        )

    def __init__(self):
        self._vcc = vcc.RpcExchanger()
        self._redis = self._vcc.get_redis_instance()
        self._pubsub = self._redis.pubsub()
        self._messages: list[RedisMessage] = list()
        # asyncio.get_event_loop().create_task(self._ainit())


if __name__ == "__main__":
    db.create_tables([User, Chat, Message])
    asyncio.set_event_loop(loop := asyncio.new_event_loop())
    server = base.RpcServiceFactory()
    service = Record()
    server.register(service)
    loop.create_task(server.aconnect())
    loop.create_task(service._ainit())
    loop.run_forever()
