import datetime
import itertools
import typing
from peewee import (
    Model,
    BigAutoField,
    CharField,
    IntegerField,
    ForeignKeyField,
    BooleanField,
    BitField,
    SqliteDatabase,
    TimestampField,
    TextField,
)
from peewee import *
from playhouse.shortcuts import ReconnectMixin
import os


def patch_save(Model):
    #HACK
    save_orig=Model.save
    def save(self,*args,**kwargs):
        save_orig(self,*args,**kwargs)
        self._meta.database.commit()

    Model.save=save
patch_save(Model)
def bind_model(model, db):
    model.bind(db)
    return model


class User(Model):
    id = BigAutoField(primary_key=True)
    name = CharField(max_length=16, unique=True)
    nickname = CharField(max_length=20)
    password = CharField(max_length=256)
    salt = CharField()
    # Permissions
    # login using username/password
    login = BooleanField(default=True)
    oauth = CharField(null=True)
    oauth_data = CharField(null=True)  # Used by oauth providers

    @property
    def friends(self) -> "itertools.chain[User]":
        return itertools.chain(self.friends1, self.friends2) # type: ignore


class UserMetadata(Model):
    id = IntegerField(primary_key=True)
    key = CharField()
    value = CharField()

class Friendship(Model):
    id = BigAutoField(primary_key=True)
    friend1 = ForeignKeyField(User, backref="friends1")
    friend2 = ForeignKeyField(User, backref="friends2")

class FriendRequest(Model):
    id = BigAutoField(primary_key=True)
    sender = ForeignKeyField(User, backref="sent_invitations")
    receiver = ForeignKeyField(User, backref="received_invitations")
    time = DateTimeField(default=datetime.datetime.now)
    reason = TextField(null=True)

    class Meta:
        indexes = ((("sender", "receiver"), True),)


class Chat(Model):
    id = BigAutoField(primary_key=True)
    name = CharField(max_length=20)
    friendship = ForeignKeyField(Friendship, backref="chats", on_delete="CASCADE", null=True)
    # Parent chat
    parent = ForeignKeyField(
        "self", backref="sub_chats", null=True, on_delete="CASCADE"
    )
    # Permissions
    public = BooleanField(default=False)


class ChatUser(Model):
    id = BigAutoField(primary_key=True)
    user = ForeignKeyField(User, backref="chat_users", on_delete="CASCADE")
    chat = ForeignKeyField(Chat, backref="chat_users", on_delete="CASCADE")
    nickname = CharField(max_length=20, null=True)
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
    # Change one's nickname
    change_nickname = permissions.flag(512)

    class Meta:
        indexes = ((("user", "chat"), True),)

class Bot(Model):
    id = BigAutoField(primary_key=True)
    name = CharField(max_length=16, unique=True)
    token = CharField(max_length=32)


class ChatBot(Model):
    id = BigAutoField(primary_key=True)
    bot = ForeignKeyField(Bot, backref="chat_bots", on_delete="CASCADE")
    chat = ForeignKeyField(Chat, backref="chat_bots", on_delete="CASCADE")

    class Meta:
        indexes = ((("bot", "chat"), True),)


class Reconnect(object):
    def __init__(self, *args, **kwargs):
        super(Reconnect, self).__init__(*args, **kwargs)

    def execute(self, sql, params=None, commit=None):
        try:
            return super(Reconnect, self).execute(sql, params)
        except Exception as exc:
            print(1)
            if self.in_transaction():
                raise exc
            self.close()
            self.connect()
            print(123)
            return super(Reconnect, self).execute(sql, params)


def ReconnectDB(database: type, *args, **kwargs):
    return type(database.__name__, (Reconnect, database), {})(*args, **kwargs)


def get_database():
    if "DATABASE" in os.environ:
        return eval(os.environ["DATABASE"])
    else:
        return SqliteDatabase(
            "db.db",
            pragmas={
                "journal_mode": "wal",
                "foreign_keys": 1,
                "ignore_check_constraints": 0,
            },
        )
