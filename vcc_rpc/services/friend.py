#!/usr/bin/env python
# type: ignore
from __future__ import annotations

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
        return [friend.id for friend in user.friends]
    
    def send_friend_request(self, user_id: int, friend_id: int, reason: str | None) -> bool:
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
        if user is None or request is None or user.id != request.sender_id:
            return False
        try:
            with db.atomic():
                request.delete_instance()
                friendship = Friendship.create(friend1=user, friend2=request.receiver)
                chat = Chat.create(name="friend chat", friendship=friendship)
                for i in [user, request.receiver]:
                    ChatUser.create(user=i, chat=chat, permissions=16)

        except IntegrityError:
            return False

    

if __name__ == "__main__":
    db.create_tables([User, Chat, ChatUser, Friendship, FriendRequest])
    server = RpcServiceFactory()
    server.register(FriendService(), name="friend")
    server.connect()
