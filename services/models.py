from peewee import *

def bind_model(model,db):
    model.bind(db)
    return model

class User(Model):
    id = BigAutoField(primary_key=True)
    name = CharField(max_length=16, unique=True)
    password = CharField(max_length=16)

class Chat(Model):
    id = BigAutoField(primary_key=True)
    name = CharField(max_length=20)

class ChatUser(Model):
    id = BigAutoField(primary_key=True)
    user = ForeignKeyField(User, backref="chat_users")
    chat = ForeignKeyField(Chat, backref="chat_users")
