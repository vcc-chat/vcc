#!/usr/bin/env python

import uuid

import peewee

import base


db = peewee。SqliteDatabase("users.db") # just for test

class BaseModel(peewee.Model):
    class Meta:
        database = db

class User(BaseModel):
    id=peewee.UUIDField
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
            User.create(id=uuid.uuid4(),username=username, password=password)
            return True
        except:
            return False

if __name__ == "__main__":
    db.create_tables([User])
    server = base.RpcServiceFactory()
    server.register(Main())
    server.connect()
