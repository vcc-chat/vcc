from peewee import *
import os


def bind_model(model, db):
    model.bind(db)
    return model


class User(Model):
    id = BigAutoField(primary_key=True)
    name = CharField(max_length=16, unique=True)
    password = CharField(max_length=16)
    salt = CharField()
    online_count = IntegerField(default=0)
    # Permissions
    login = BooleanField(default=True)
    oauth = CharField(null=True)
    oauth_data = CharField(null=True)  # Used by oauth providers


class Chat(Model):
    id = BigAutoField(primary_key=True)
    name = CharField(max_length=20)
    # Parent chat
    parent = ForeignKeyField("self", backref="sub_chats", null=True)
    # Permissions
    public = BooleanField(default=True)


class ChatUser(Model):
    id = BigAutoField(primary_key=True)
    user = ForeignKeyField(User, backref="chat_users")
    chat = ForeignKeyField(Chat, backref="chat_users")
    # Permissions
    permissions = BitField(default=16 | 64)
    # Kick other users in the chat
    kick = permissions.flag(1)
    # Rename the chat
    rename = permissions.flag(2)
    # Invite others to join the chat
    invite = permissions.flag(4)
    # Modify self and other people's permission
    modify_permission = permissions.flag(8)
    # Send messages
    send = permissions.flag(16)
    # Create sub-chats
    create_sub_chat = permissions.flag(32)
    # Create sessions
    create_session = permissions.flag(64)
    # Being banned, any other permission will be ignored
    banned = permissions.flag(256)


class Bot(Model):
    id = BigAutoField(primary_key=True)
    name = CharField(max_length=16, unique=True)
    token = CharField(max_length=32)


class ChatBot(Model):
    id = BigAutoField(primary_key=True)
    bot = ForeignKeyField(Bot, backref="chat_bots")
    chat = ForeignKeyField(Chat, backref="chat_bots")


def get_database():
    if "DATABASE" in os.environ:
        return eval(os.environ["DATABASE"])
    else:
        return SqliteDatabase("db.db")


__all__ = ["bind_model", "User", "Chat", "ChatUser", "Bot", "ChatBot", "get_database"]
