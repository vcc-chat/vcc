#!/usr/bin/env python
# type: ignore
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

    @db.atomic()
    def create(self, name: str) -> int:
        warnings.warn(DeprecationWarning("create is deprecated, use create_with_user instead"))
        return Chat.create(name=name).id

    @db.atomic()
    def create_with_user(self, name: str, user_id: int) -> int | None:
        try:
            new_chat = Chat.create(name=name)
            user = User.get_by_id(user_id)
            ChatUser.create(user=user, chat=new_chat, kick=True, rename=True)
            return new_chat.id
        except:
            return None

    @db.atomic()
    def get_name(self, id: int) -> str | None:
        chat = Chat.get_or_none(id=id)
        if chat is None:
            return None
        return chat.name

    @db.atomic()
    def get_users(self, id: int) -> list[tuple[int, str]]:
        chat = Chat.get_or_none(Chat.id == id)
        if chat is None:
            return []
        chat_users = chat.chat_users
        user_names = [(chat_user.user.id, chat_user.user.name) for chat_user in chat_users]
        return user_names

    @db.atomic()
    def join(self, chat_id: int, user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            if not chat.public:
                return False
            user = User.get_by_id(user_id)
            ChatUser.get_or_create(chat=chat, user=user)
            self._redis.publish(f"messages:{chat_id}", json.dumps({
                "username": SYSTEM_USER_NAME,
                "msg": f"{user.name} has joined the chat."
            }))
            return True
        except:
            return False

    @db.atomic()
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

    @db.atomic()
    def kick(self, chat_id: int, user_id: int, kicked_user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            kicked_user = User.get_by_id(kicked_user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            if not chat_user.kick:
                return False
            kicked_chat_user = ChatUser.get(chat=chat, user=kicked_user)
            kicked_chat_user.delete_instance()
            self._redis.publish(f"messages:{chat_id}", json.dumps({
                "username": SYSTEM_USER_NAME,
                "msg": f"{kicked_user.name} has been kicked."
            }))
            return True
        except:
            return False
    
    @db.atomic()
    def rename(self, chat_id: int, user_id: int, new_name: str) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            if not chat_user.rename:
                return False
            chat.name = new_name
            chat.save()
            self._redis.publish(f"messages:{chat_id}", json.dumps({
                "username": SYSTEM_USER_NAME,
                "msg": f"The chat has been renamed to {new_name}."
            }))
            return True
        except:
            return False

    @db.atomic()
    def invite(self, chat_id: int, user_id: int, invited_user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            invited_user = User.get_by_id(invited_user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            if not chat_user.invite or chat.public:
                return False
            try:
                ChatUser.get(chat=chat, user=invited_user)
                return False
            except:
                pass
            ChatUser.create(chat=chat, user=invited_user)
            self._redis.publish(f"messages:{chat_id}", json.dumps({
                "username": SYSTEM_USER_NAME,
                "msg": f"{invited_user.name} has been invited by {user.name}."
            }))
            return True
        except:
            return False

    @db.atomic()
    def check_send(self, chat_id: int, user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            return chat_user.send
        except:
            return False

    @db.atomic()
    def modify_user_permission(self, chat_id: int, user_id: int, modified_user_id: int, name: str, value: bool) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            modified_user = User.get_by_id(modified_user_id)
            modified_chat_user = ChatUser.get(chat=chat, user=modified_user)
            if not chat_user.modify_permission:
                return False
            if not hasattr(modified_chat_user, name) or not isinstance(getattr(modified_chat_user, name), bool):
                return False
            # Maybe dangerous
            setattr(modified_chat_user, name, value)
            modified_chat_user.save()
            return True
        except:
            return False
    
    @db.atomic()
    def modify_permission(self, chat_id: int, user_id: int, name: str, value: bool) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            if not chat_user.modify_permission:
                return False
            if not hasattr(chat, name) or not isinstance(getattr(chat, name), bool):
                return False
            # Maybe dangerous
            setattr(chat, name, value)
            chat.save()
            return True
        except:
            return False

    @db.atomic()
    def get_user_permission(self, chat_id: int, user_id: int) -> dict[str, bool]:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            # TODO: change after adding permissions
            return {i: getattr(chat_user, i) for i in ["kick", "rename", "invite", "modify_permission", "send"]}
        except:
            return {}
        
    @db.atomic()
    def get_permission(self, chat_id: int) -> dict[str, bool]:
        try:
            chat = Chat.get_by_id(chat_id)
            # TODO: change after adding permissions
            return {i: getattr(chat, i) for i in ["public"]}
        except:
            return {}
    
    @db.atomic()
    def get_all_user_permission(self, chat_id: int) -> dict[int, dict[str, bool]]:
        try:
            chat = Chat.get_by_id(chat_id)
            chat_users = chat.chat_users
            # TODO: change after adding permissions
            return {
                chat_user.id: { name: getattr(chat_user, name) for name in ["kick", "rename", "invite", "modify_permission", "send"] }
                for chat_user in chat_users
            }
        except:
            return {}


    @db.atomic()
    def chat_list(self) -> list[int]:
        warnings.warn(DeprecationWarning("chat_list is slow so that it shouldn't be used"))
        return [i.id for i in Chat.select()]

    @db.atomic()
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
