#!/usr/bin/env python

from peewee import *

import base
import models

db = models.get_database()

User=models.bind_model(models.User,db)

class Main:
    def login(self, username: str, password: str) -> int | None:
        user = User.get_or_none(User.name == username, User.password == password)
        if user is None:
            return None
        return user.id
    
    def register(self, username: str, password: str) -> bool:
        try:
            User.create(name=username, password=password)
            return True
        except:
            return False

    def user_get_name(self, id: int) -> str | None:
        user = User.get_or_none(id=id)
        if user is None:
            return None
        return user.name

if __name__ == "__main__":
    db.create_tables([User])
    server = base.RpcServiceFactory("login")
    server.register(Main())
    host=server.get_host()
    server.connect(host=host[0],port=host[1])
