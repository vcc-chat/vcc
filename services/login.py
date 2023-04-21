#!/usr/bin/env python

import hmac
import random
import string
import json
import uuid

from typing import Any, Callable, cast

# from aiohttp.http_websocket import PACK_LEN1
from peewee import *

import base
import models

db = models.get_database()

User = models.bind_model(models.User, db)
UserMetadata = models.bind_model(models.UserMetadata, db)


def random_string(length: int) -> str:
    return "".join(
        random.SystemRandom().choice(string.ascii_letters + string.digits)
        for _ in range(length)
    )


class Login:
    def login(self, username: str, password: str) -> int | None:
        if username == "system":
            return None
        user = User.get_or_none(User.name == username)
        if user is None:
            return None
        if not user.login:
            return None
        hashed_password = hmac.new(
            user.salt.encode(), password.encode(), "sha512"
        ).hexdigest()
        if hashed_password != user.password:
            return None
        return user.id

    def register(self, username, password, oauth=None, oauth_data=None):
        if username == "system":
            return False
        hashed_password = hmac.new(
            (salt := random_string(10)).encode(), password.encode(), "sha512"
        ).hexdigest()
        try:
            User(
                name=username,
                nickname=username,
                password=hashed_password,
                salt=salt,
                oauth=oauth,
                oauth_data=oauth_data,
            ).save()
            return True
        except:
            return False

    # @db.atomic() ### TODO
    # def do_raw_query(self,cond:dict):
    #     for i in cond:
    #         try:
    #             key=getattr(User,i)
    #         except:
    #             return None
    #         e

    def post_oauth(self, platform: str, metadata: str):
        if (
            user := User.get_or_none(
                User.oauth == platform, User.oauth_data == metadata
            )
        ) == None:
            username = "oauth_" + platform + str(uuid.uuid4())
            self.register(
                username, str(uuid.uuid4()), oauth=platform, oauth_data=metadata
            )
            user = User.get_or_none(User.name == username)
        return user.id

    def query_metadata(self, uid: int, key: str):
        return UserMetadata.get_or_none(
            UserMetadata.id == uid, UserMetadata.key == key
        ).value

    def modify_metadata(self, uid, key, value):
        metadata = UserMetadata.get_or_none(
            UserMetadata.id == uid, UserMetadata.key == key
        ) or UserMetadata(id=uid, key=key, value="")
        if type(value) == str:
            print(value)
            metadata.value = value
        elif isinstance(value, Callable):
            print(1)
            metadata.value = str(value(metadata.value))
        metadata.save()

    def get_name(self, id: int) -> str | None:
        user = User.get_or_none(id=id)
        if user is None:
            return None
        return user.name

    def get_nickname(self, id: int) -> str | None:
        user = User.get_or_none(id=id)
        if user is None:
            return None
        if user.nickname is not None:
            return user.nickname
        return user.name

    def change_nickname(self, id: int, nickname: str) -> None:
        User.update(nickname=nickname).where(User.nickname == nickname).execute()

    @db.atomic()
    def add_online(self, id: int) -> bool:
        user = User.get_or_none(id=id)  # A stupid query just for check if user exists
        if user is None:
            return False
        self.modify_metadata(id, "online_count", lambda x: int(x) + 1 if x != "" else 1)
        return True

    @db.atomic()
    def add_offline(self, id: int) -> bool:
        user = User.get_or_none(id=id)
        if user is None:
            return False
        self.modify_metadata(
            id,
            "online_count",
            lambda x: (1 if int(x) < 0 else int(x)) - 1 if x != "" else 0,
        )
        return True

    @db.atomic()
    def is_online(self, ids: Any) -> list[bool]:
        try:
            return [
                not UserMetadata.get_or_none(
                    UserMetadata.id == id,
                    UserMetadata.key == "online_count",
                    UserMetadata.value == "0",
                )
                for id in ids
            ]
        except:
            return []


if __name__ == "__main__":
    db.create_tables([User, UserMetadata])
    server = base.RpcServiceFactory("login")
    server.register(Login())
    server.connect()
