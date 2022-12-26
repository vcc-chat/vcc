#!/usr/bin/env python

from peewee import *

import base
import models

if "DATABASE" in os.environ:
    db=eval(os.environ["DATABASE"])
else:
    db = SqliteDatabase("db.db")

User=models.bind_model(models.User,db)

class Main:
    def login(self, username, password):
        return User.get_or_none(User.name == username, User.password == password) is not None
    
    def register(self, username, password):
        try:
            User.create(name=username, password=password)
            return True
        except:
            return False

    def user_get_name(self, id):
        user = User.get_or_none(id=id)
        if user is None:
            return None
        return user.name

if __name__ == "__main__":
    db.create_tables([User])
    server = base.RpcServiceFactory()
    server.register(Main())
    server.connect()
