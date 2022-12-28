#!/usr/bin/env python
import json

from peewee import *

import base
import warnings
import redis
from models import *

db = get_database()

bind_model(User,db)
bind_model(Chat,db)
bind_model(ChatUser,db)

SYSTEM_USER_NAME = "system"

class Main:
    def __init__(self):
        self._redis = redis.Redis()

    def create(self, name: str) -> int:
        return Chat.create(name=name).id

    def get_name(self, id: int) -> str | None:
        chat = Chat.get_or_none(id=id)
        if chat is None:
            return None
        return chat.name

    def get_users(self, id: int) -> list[int]:
        chat = Chat.get_or_none(Chat.id == id)
        if chat is None:
            return []
        chat_users = chat.chat_users
        user_names = [chat_user.user.id for chat_user in chat_users]
        return user_names

    def join(self, chat_id: int, user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            ChatUser.get_or_create(chat=chat, user=user)
            self._redis.publish(f"messages:{chat_id}", json.dumps({
                "username": SYSTEM_USER_NAME,
                "msg": f"{user.name} has joined the chat."
            }))
            return True
        except:
            return False

    def quit(self, chat_id: int, user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            chat_user.delete_instance()
            self._redis.publish(f"messages:{chat_id}", json.dumps({
                "username": SYSTEM_USER_NAME,
                "msg": f"{user.name} has quit the chat."
            }))
            return True
        except:
            return False

    def list(self) -> list[int]:
        warnings.warn(DeprecationWarning("chat_list is slow so that it shouldn't be used"))
        return [i.id for i in Chat.select()]

    def list_somebody_joined(self, id: int) -> list[tuple[int, str]]:
        # after json.dumps, tuple returned will become json Array
        try:
            user = User.get_by_id(id)
            chat_users = user.chat_users
            return [(chat_user.chat.id, chat_user.chat.name) for chat_user in chat_users]
        except:
            return []


if __name__ == "__main__":
    db.create_tables([User, Chat,ChatUser])
    server = base.RpcServiceFactory("chat")
    server.register(Main())
    server.connect()
