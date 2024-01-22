#!/usr/bin/env python
# type: ignore
from __future__ import annotations
import json
import os

from peewee import *
from typing import Any, Literal

import base
import warnings
import redis.asyncio as redis
from models import *
import traceback
db = get_database()

bind_model(User, db)
bind_model(Chat, db)
bind_model(ChatUser, db)

SYSTEM_UID = -1
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
    "banned",
    "change_nickname"
]
all_chat_permissions = ["public"]


class ChatService:
    def __init__(self):
        self._redis: redis.Redis[bytes] = redis.Redis.from_url(
            os.environ.get("REDIS_URL", "redis://localhost")
        )

    async def _send_message(self, chat: int, msg: str) -> None:
        await self._redis.publish(
            f"messages",
            json.dumps(
                {
                    "uid": SYSTEM_UID,
                    "username": SYSTEM_USER_NAME,
                    "msg": msg,
                    "chat": chat,
                }
            ),
        )

    async def _send_event(self, chat: int, type: EventType, data: Any) -> None:
        await self._redis.publish(
            f"events", json.dumps({"type": type, "data": data, "chat": chat})
        )

    async def create_with_user(
        self, name: str, user_id: int, parent_chat_id: int
    ) -> int | None:
        # parent_chat_id is -1 if the chat has no parent
        try:
            if parent_chat_id == -1:
                new_chat = Chat.create(name=name, parent=None)
            else:
                parent_chat = Chat.get_by_id(parent_chat_id)
                if parent_chat.parent is not None:
                    # Only 2 levels are allowed
                    return None
                # Make sure creator has already joined the parent chat
                parent_chat_user = ChatUser.get(user=user_id, chat=parent_chat)
                if not parent_chat_user.create_sub_chat or parent_chat_user.banned:
                    return None
                new_chat = Chat.create(name=name, parent=parent_chat)
            ChatUser.create(
                user=user_id,
                chat=new_chat,
                permissions=1 | 2 | 4 | 8 | 16 | 32 | 64 | 512,
            )
            return new_chat.id
        except:
            return None

    async def get_name(self, id: int) -> str | None:
        chat = Chat.get_or_none(id=id)
        if chat is None:
            return None
        return chat.name

    async def get_users(self, id: int) -> list[tuple[int, str]]:
        # Won't return users of sub-chats
        chat_users = ChatUser.select().where(ChatUser.chat == id).execute()
        user_names = [
            (
                chat_user.user.id,
                chat_user.user.nickname
                if chat_user.nickname is None
                else chat_user.nickname,
            )
            for chat_user in chat_users
        ]
        return user_names

    async def join(self, chat_id: int, user_id: int) -> bool:
        try:
            print(0)
            chat = Chat.get_by_id(chat_id)
            if not chat.public:
                return False
            if chat.parent is not None:
                parent_chat = chat.parent
                if not parent_chat.public:
                    return False
                # Also join parent chat
                parent_chat_user, parent_chat_user_created = ChatUser.get_or_create(
                    chat_id=parent_chat, user_id=user_id
                )
                if parent_chat_user.banned:
                    return False
            chat_user, chat_user_created = ChatUser.get_or_create(chat_id=chat, user_id=user_id)
            if chat_user.banned:
                return False
            # await self._send_message(chat_id, f"{user.name} has joined the chat.")
            # await self._send_event(
            #     chat_id, "join", {"user_name": user.name, "user_id": user_id}
            # )
            print(1)
            return True
        except:
            print(2)
            traceback.print_exc()
            return False

    async def quit(self, chat_id: int, user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            if chat.sub_chats.exists():
                for i in (
                    chat.sub_chats.join(ChatUser)
                    .where(ChatUser.chat == Chat.id)
                    .where(ChatUser.user == user)
                    .execute()
                ):
                    # Users must quit any sub chat first, and we help them to quit
                    i.chat_user.delete_instance()
            chat_user = ChatUser.get(chat=chat, user=user)
            chat_user.delete_instance()
            await self._send_message(chat_id, f"{user.name} has quit the chat.")
            await self._send_event(
                chat_id, "quit", {"user_name": user.name, "user_id": user_id}
            )
            return True
        except:
            return False

    async def kick(self, chat_id: int, user_id: int, kicked_user_id: int) -> bool:
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
                for i in (
                    chat.sub_chats.join(ChatUser)
                    .where(ChatUser.chat == Chat.id)
                    .where(ChatUser.user == kicked_user)
                    .execute()
                ):
                    # Kick him from any sub-chat
                    i.chat_user.delete_instance()
            kicked_chat_user.delete_instance()
            await self._send_message(chat_id, f"{kicked_user.name} has been kicked.")
            await self._send_event(
                chat_id,
                "kick",
                {
                    "kicked_user_name": kicked_user.name,
                    "kicked_user_id": kicked_user_id,
                },
            )
            return True
        except:
            return False

    async def rename(self, chat_id: int, user_id: int, new_name: str) -> bool:
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
            await self._send_message(chat_id, f"The chat has been renamed {new_name}.")
            await self._send_event(
                chat_id, "rename", {"old_name": old_name, "new_name": new_name}
            )
            return True
        except:
            return False

    async def invite(self, chat_id: int, user_id: int, invited_user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            user = User.get_by_id(user_id)
            invited_user = User.get_by_id(invited_user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            if chat_user.banned:
                return False
            if not chat_user.invite and not chat.public:
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
            await self._send_message(
                chat_id, f"{invited_user.name} has been invited by {user.name}."
            )
            await self._send_event(
                chat_id,
                "invite",
                {
                    "user_name": user.name,
                    "user_id": user_id,
                    "invited_user_name": invited_user.name,
                    "invited_user_id": invited_user_id,
                },
            )
            return True
        except:
            return False

    async def check_send(self, chat_id: int, user_id: int) -> bool:
        try:
            chat_user = ChatUser.get(chat=chat_id, user=user_id)
            # Needn't check parent chat user
            return chat_user.send and not chat_user.banned
        except:
            return False

    async def check_create_session(self, chat_id: int, user_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            if chat.parent is None:
                return False
            user = User.get_by_id(user_id)
            chat_user = ChatUser.get(chat=chat, user=user)
            return chat_user.create_session and not chat_user.banned
        except:
            return False

    async def modify_user_permission(
        self, chat_id: int, user_id: int, modified_user_id: int, name: str, value: bool
    ) -> bool:
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
                ChatUser.update(permissions=ChatUser.banned.set()).where(
                    ChatUser.chat.parent == chat, ChatUser.user == modified_user
                ).execute()
            return True
        except:
            return False

    async def modify_permission(
        self, chat_id: int, user_id: int, name: str, value: bool
    ) -> bool:
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

    async def get_user_permission(self, chat_id: int, user_id: int) -> dict[str, bool]:
        try:
            chat_user = ChatUser.get(chat=chat_id, user=user_id)
            if chat_user.banned:
                return False
            return {i: getattr(chat_user, i) for i in all_user_permissions}
        except:
            return {}

    async def get_permission(self, chat_id: int) -> dict[str, bool]:
        try:
            chat = Chat.get_by_id(chat_id)
            return {i: getattr(chat, i) for i in all_chat_permissions}
        except:
            return {}

    async def get_all_user_permission(self, chat_id: int) -> dict[int, dict[str, bool]]:
        try:
            chat_users = ChatUser.select().where(ChatUser.chat == chat_id).execute()
            return {
                chat_user.user.id: {
                    name: getattr(chat_user, name) for name in all_user_permissions
                }
                for chat_user in chat_users
            }
        except:
            return {}

    async def list_somebody_joined(self, id: int) -> list[tuple[int, str, int | None]]:
        # after json.dumps, tuple returned will become json Array
        try:
            chat_users = (
                ChatUser.select()
                .where(~ChatUser.banned, ChatUser.user == id)
                .join(Chat)
                .select(Chat.id, Chat.name, Chat.parent)
                .execute()
            )
            return [
                (
                    chat_user.chat.id,
                    chat_user.chat.name,
                    None if chat_user.chat.parent is None else chat_user.chat.parent.id,
                )
                for chat_user in chat_users
            ]
        except:
            return []

    async def list_sub_chats(self, id: int) -> list[tuple[int, str]]:
        return [
            (i.id, i.name) for i in Chat.select().where(Chat.parent == id).execute()
        ]

    async def change_nickname(
        self, chat_id: int, user_id: int, changed_user_id: int, new_name: str
    ):
        if changed_user_id == user_id or (
            (chat_user := ChatUser.get_or_none(chat=chat_id, user=user_id)) is not None
            and chat_user.change_nickname
            and not chat_user.banned
        ):
            ChatUser.update(nickname=new_name).where(
                ChatUser.chat == chat_id, ChatUser.user == changed_user_id
            ).execute()
            return True
        return False

    async def get_nickname(self, chat_id: int, user_id: int):
        if user_id == SYSTEM_UID:
            return SYSTEM_USER_NAME
        chat_user = ChatUser.get_or_none(chat=chat_id, user=user_id)
        if chat_user is not None and chat_user.nickname is not None:
            return chat_user.nickname
        user = User.get_or_none(user=user_id)
        if user is None:
            return None
        if user.nickname is None:
            return user.name
        return user.nickname


if __name__ == "__main__":
    db.create_tables([User, Chat, ChatUser, FriendRequest, Friendship])
    server = base.RpcServiceFactory()
    server.register(ChatService(),async_mode=True,name="chat")
    server.connect()
