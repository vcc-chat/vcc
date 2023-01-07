#!/usr/bin/env python
# type: ignore
import json

from peewee import *
from typing import Any, Literal

import base
import warnings
import redis
from models import *

db = get_database()

bind_model(User,db)
bind_model(Chat,db)
bind_model(ChatUser,db)

SYSTEM_USER_NAME = "system"

EventType = Literal["join", "quit", "kick", "rename", "invite"]

all_user_permissions = [
    "kick",
    "rename",
    "invite",
    "modify_permission",
    "send",
    "create_sub_chat",
    "create_session",
    "banned"
]
all_chat_permissions = ["public"]

class Main:
    def __init__(self):
        self._redis: redis.Redis[bytes] = redis.Redis()

    def _send_message(self, chat: int, msg: str) -> None:
        self._redis.publish(f"messages:{chat}", json.dumps({
            "username": SYSTEM_USER_NAME,
            "msg": msg
        }))

    def _send_event(self, chat: int, type: EventType, data: Any) -> None:
        self._redis.publish(f"events:{chat}", json.dumps({
            "type": type,
            "data": data
        }))

    @db.atomic()
    def create_with_user(self, name: str, user_id: int, parent_chat_id: int) -> int | None:
        # parent_chat_id is -1 if the chat has no parent
        try:
            user = User.get_by_id(user_id)
            if parent_chat_id == -1:
                new_chat = Chat.create(name=name, parent=None)
            else:
                parent_chat = Chat.get_by_id(parent_chat_id)
                if parent_chat.parent is not None:
                    # Only 2 levels are allowed
                    return None
                # Make sure creator has already joined the parent chat
                parent_chat_user = ChatUser.get(user=user, chat=parent_chat)
                if not parent_chat_user.create_sub_chat or parent_chat_user.banned:
                    return None
                new_chat = Chat.create(name=name, parent=parent_chat)
            ChatUser.create(user=user, chat=new_chat, permissions=1 | 2 | 4 | 8 | 16 | 32 | 64 | 128)
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
        # Won't return users of sub-chats
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
            if chat.parent is not None:
                parent_chat = chat.parent
                if not parent_chat.public:
                    return False
                # Also join parent chat
                parent_chat_user, parent_chat_user_created = ChatUser.get_or_create(chat=parent_chat, user=user)
                if parent_chat_user.banned:
                    return False
            chat_user, chat_user_created = ChatUser.get_or_create(chat=chat, user=user)
            if chat_user.banned:
                return False
            self._send_message(chat_id, f"{user.name} has joined the chat.")
            self._send_event(chat_id, "join", {
                "user_name": user.name,
                "user_id": user_id
            })
            return True
        except:
            return False

    @db.atomic()
    def quit(self, chat_id: int, user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            if chat.sub_chats.exists():
                for i in chat.sub_chats.join(ChatUser).where(ChatUser.chat == Chat.id).where(ChatUser.user == user).execute():
                    # Users must quit any sub chat first, and we help them to quit
                    i.chat_user.delete_instance()
            chat_user = ChatUser.get(chat=chat, user=user)
            chat_user.delete_instance()
            self._send_message(chat_id, f"{user.name} has quit the chat.")
            self._send_event(chat_id, "quit", {
                "user_name": user.name,
                "user_id": user_id
            })
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
            if chat_user.banned:
                return False
            if not chat_user.kick:
                parent_chat = chat.parent
                if parent_chat is None:
                    return False
                parent_chat_user = ChatUser.get(chat=parent_chat, user=user)
                if not parent_chat_user.kick:
                    return False
            kicked_chat_user = ChatUser.get(chat=chat, user=kicked_user)
            if chat.sub_chats.exists():
                for i in chat.sub_chats.join(ChatUser).where(ChatUser.chat == Chat.id).where(ChatUser.user == kicked_user).execute():
                    # Kick him from any sub-chat
                    i.chat_user.delete_instance()
            kicked_chat_user.delete_instance()
            self._send_message(chat_id, f"{kicked_user.name} has been kicked.")
            self._send_event(chat_id, "kick", {
                "kicked_user_name": kicked_user.name,
                "kicked_user_id": kicked_user_id
            })
            return True
        except:
            return False
    
    @db.atomic()
    def rename(self, chat_id: int, user_id: int, new_name: str) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            if chat_user.banned:
                return False
            if not chat_user.rename:
                parent_chat = chat.parent
                if parent_chat is None:
                    return False
                parent_chat_user = ChatUser.get(chat=parent_chat, user=user)
                if not parent_chat_user.rename:
                    return False
            old_name = chat.name
            chat.name = new_name
            chat.save()
            self._send_message(chat_id, f"The chat has been renamed {new_name}.")
            self._send_event(chat_id, "rename", {
                "old_name": old_name,
                "new_name": new_name
            })
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
            if chat_user.banned:
                return False
            if not chat_user.invite or chat.public:
                return False
            try:
                # Include banned
                ChatUser.get(chat=chat, user=invited_user)
                return False
            except:
                pass
            if chat.parent is not None:
                parent_chat = chat.parent
                parent_chat_user = ChatUser.get(chat=chat.parent, user=user)
                if not parent_chat_user.invite or parent_chat.public:
                    return False
                # Also join parent chat
                ChatUser.get_or_create(chat=parent_chat, user=user)
            ChatUser.create(chat=chat, user=invited_user)
            self._send_message(chat_id, f"{invited_user.name} has been invited by {user.name}.")
            self._send_event(chat_id, "invite", {
                "user_name": user.name,
                "user_id": user_id,
                "invited_user_name": invited_user.name,
                "invited_user_id": invited_user_id
            })
            return True
        except:
            return False

    @db.atomic()
    def check_send(self, chat_id: int, user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            # Needn't check parent chat user
            return chat_user.send and not chat_user.banned
        except:
            return False

    @db.atomic()
    def check_create_session(self, chat_id: int, user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            if chat.parent is None:
                return False
            user = User.get_by_id(user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            return chat_user.create_session and not chat_user.banned
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
            if chat_user.banned:
                return False
            if not chat_user.modify_permission:
                parent_chat = chat.parent
                if parent_chat is None:
                    return False
                parent_chat_user = ChatUser.get(chat=parent_chat, user=user)
                if not parent_chat_user.modify_permission:
                    return False
            if name not in all_user_permissions:
                return False
            # Maybe dangerous
            setattr(modified_chat_user, name, value)
            modified_chat_user.save()
            if name == "banned" and value:
                ChatUser.update(permissions=ChatUser.banned.set()).where(ChatUser.chat.parent == chat & ChatUser.user == modified_user).execute()
            return True
        except:
            return False
    
    @db.atomic()
    def modify_permission(self, chat_id: int, user_id: int, name: str, value: bool) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            if chat_user.banned:
                return False
            if not chat_user.modify_permission:
                parent_chat = chat.parent
                if parent_chat is None:
                    return False
                parent_chat_user = ChatUser.get(chat=parent_chat, user=user)
                if not parent_chat_user.modify_permission:
                    return False
            if name not in all_chat_permissions:
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
            if chat_user.banned:
                return False
            return {i: getattr(chat_user, i) for i in all_user_permissions}
        except:
            return {}
        
    @db.atomic()
    def get_permission(self, chat_id: int) -> dict[str, bool]:
        try:
            chat = Chat.get_by_id(chat_id)
            return {i: getattr(chat, i) for i in all_chat_permissions}
        except:
            return {}
    
    @db.atomic()
    def get_all_user_permission(self, chat_id: int) -> dict[int, dict[str, bool]]:
        try:
            chat = Chat.get_by_id(chat_id)
            chat_users = chat.chat_users
            return {
                chat_user.user.id: { name: getattr(chat_user, name) for name in all_user_permissions }
                for chat_user in chat_users
            }
        except:
            return {}

    @db.atomic()
    def list_somebody_joined(self, id: int) -> list[tuple[int, str, int | None]]:
        # after json.dumps, tuple returned will become json Array
        try:
            user = User.get_by_id(id)
            chat_users = user.chat_users.where(~ChatUser.banned).join(Chat).select(Chat.id, Chat.name, Chat.parent).execute()
            return [(chat_user.chat.id, chat_user.chat.name, None if chat_user.chat.parent is None else chat_user.chat.parent.id) for chat_user in chat_users]
        except:
            return []

    @db.atomic()
    def list_sub_chats(self, id: int) -> list[tuple[int, str]]:
        try:
            chat = Chat.get_by_id(id)
            sub_chats = chat.sub_chats
            return [(i.id, i.name) for i in sub_chats]
        except:
            return []


if __name__ == "__main__":
    db.create_tables([User, Chat,ChatUser])
    server = base.RpcServiceFactory("chat")
    server.register(Main())
    server.connect()
