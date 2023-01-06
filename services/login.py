#!/usr/bin/env python

import hmac
import random
import string
import json

from typing import Any
from peewee import *

import base
import models

db = models.get_database()

User=models.bind_model(models.User,db)



def random_string(length:int)->str:
    return "".join(
        random.SystemRandom().choice(string.ascii_letters + string.digits)
        for _ in range(length)
    )
class Login:
    @db.atomic()
    def login(self, username: str, password: str) -> int | None:
        if username == "system":
            return None
        user = User.get_or_none(User.name == username)
        if user is None:
            return None
        if not user.login:
            return None
        hashed_password = hmac.new(user.salt.encode(), password.encode(), "sha512").hexdigest()
        if hashed_password!=user.password:
            return None
        return user.id
    
    @db.atomic()
    def register(self, username: str, password: str) -> bool:
        if username == "system":
            return False
        hashed_password = hmac.new((salt:=random_string(10)).encode(), password.encode(), "sha512").hexdigest()
        try:
            User(name=username, password=hashed_password,salt=salt).save()
            return True
        except:
            return False

    @db.atomic()
    def get_name(self, id: int) -> str | None:
        user = User.get_or_none(id=id)
        if user is None:
            return None
        return user.name

    @db.atomic()
    def add_online(self, id: int) -> bool:
        user = User.get_or_none(id=id)
        if user is None:
            return False
        user.online_count += 1
        user.save()
        return True

    @db.atomic()
    def add_offline(self, id: int) -> bool:
        user = User.get_or_none(id=id)
        if user is None:
            return False
        if user.online_count <= 0:
            return False
        user.online_count -= 1
        user.save()
        return True

    @db.atomic()
    def is_online(self, ids: Any) -> list[bool]:
        try:
            return [bool(User.get_by_id(id).online_count) for id in ids]
        except:
            return []

if __name__ == "__main__":
    db.create_tables([User])
    server = base.RpcServiceFactory("login")
    server.register(Login())
    server.connect()
