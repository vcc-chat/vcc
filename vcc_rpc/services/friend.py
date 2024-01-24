#!/usr/bin/env python
from __future__ import annotations

from typing import Any

from base import *
from models import *

db = get_database()

bind_model(User, db)
bind_model(Chat, db)
bind_model(ChatUser, db)
bind_model(Friendship, db)
bind_model(FriendRequest, db)


class FriendService:
    def get_friends(self, user_id: int) -> list[int]:
        if (user := User.get_or_none(id=user_id)) is None:
            return []
        return [friend.id for friend in user.friends if friend.id != user_id]

    def get_chat_by_friend_id(self, user_id: int, friend_id: int) -> int | None:
        friendship = Friendship.get_or_none(
            friend1=user_id, friend2=friend_id
        ) or Friendship.get_or_none(friend1=friend_id, friend2=user_id)
        if friendship is None:
            return None
        return friendship.chats.get().id

    def list_received_friend_request(self, user_id: int) -> list[Any]:
        return [
            {
                "sender": i.sender_id,
                "receiver": i.receiver_id,
                "time": i.time.timestamp(),
                "reason": i.reason,
                "id": i.id
            }
            for i in FriendRequest.select()
            .where(FriendRequest.receiver == user_id)
            .execute()
        ]

    def send_friend_request(
        self, user_id: int, friend_id: int, reason: str | None
    ) -> bool:
        user = User.get_or_none(id=user_id)
        friend = User.get_or_none(id=friend_id)
        if user is None or friend is None:
            return False
        try:
            FriendRequest.create(sender=user, receiver=friend, reason=reason)
            return True
        except:
            return False

    def accept_friend_request(self, user_id: int, request_id: int) -> bool:
        user = User.get_or_none(id=user_id)
        request = FriendRequest.get_or_none(id=request_id)
        if user is None or request is None or user.id != request.receiver_id:
            return False
        try:
            with db.atomic():
                request.delete_instance()
                friendship = Friendship.create(friend1=user, friend2=request.sender)
                chat = Chat.create(name="friend chat", friendship=friendship)
                for i in [user, request.receiver]:
                    ChatUser.create(user=i, chat=chat, permissions=16)
            return True

        except IntegrityError:
            return False

    def reject_friend_request(self, user_id: int, request_id: int) -> bool:
        user = User.get_or_none(id=user_id)
        request = FriendRequest.get_or_none(id=request_id)
        if user is None or request is None or user.id != request.receiver_id:
            return False
        request.delete_instance()
        return True


if __name__ == "__main__":
    db.create_tables([User, Chat, ChatUser, Friendship, FriendRequest])
    server = RpcServiceFactory()
    server.register(FriendService(), name="friend")
    server.connect()
