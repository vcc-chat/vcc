#!/usr/bin/env python

import base

from peewee import *

db = SqliteDatabase("users.db") # just for test

class BaseModel(Model):
    class Meta:
        database = db

class User(BaseModel):
    name = CharField(max_length=16, unique=True)
    password = CharField(max_length=16)

class Main:
    def login(self, username, password):
        try:
            User.get(User.name == username, User.password == password)
            return True
        except:
            return False
    
    def register(self, username, password):
        try:
            User.create(name=username, password=password)
            return True
        except:
            return False

if __name__ == "__main__":
    db.create_tables([User])
    server = base.RpcServer()
    server.register(Main())
    server.connect()