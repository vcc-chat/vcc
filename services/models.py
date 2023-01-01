from peewee import *
import os

def bind_model(model,db):
    model.bind(db)
    return model

class User(Model):
    id = BigAutoField(primary_key=True)
    name = CharField(max_length=16, unique=True)
    password = CharField(max_length=16)
    salt= CharField()
    # Permissions
    login = BooleanField(default=True)

class Chat(Model):
    id = BigAutoField(primary_key=True)
    name = CharField(max_length=20)
    # Parent chat
    parent = ForeignKeyField("self", backref="sub_chats")
    # Permissions
    public = BooleanField(default=True)

class ChatUser(Model):
    id = BigAutoField(primary_key=True)
    user = ForeignKeyField(User, backref="chat_users")
    chat = ForeignKeyField(Chat, backref="chat_users")
    # Permissions
    # Kick other users in the chat
    kick = BooleanField(default=False)
    # Rename the chat
    rename = BooleanField(default=False)
    # Invite others to join the chat
    invite = BooleanField(default=False)
    # Modify self and other people's permission
    modify_permission = BooleanField(default=False)
    # Send messages
    send = BooleanField(default=True)

def get_database():
    if "DATABASE" in os.environ:
        return eval(os.environ["DATABASE"])
    else:
        return SqliteDatabase("db.db")

__all__ = ["bind_model", "User", "Chat", "ChatUser", "get_database"]
