#!/usr/bin/env python
from models import *
from base import RpcServiceFactory
from chat import all_user_permissions, all_chat_permissions
import traceback
db = get_database()

bind_model(User, db)
bind_model(Chat, db)
bind_model(ChatUser, db)
bind_model(Bot, db)
bind_model(ChatBot, db)

class Main:
    @db.atomic()
    def login(self, name: str, token: str) -> int | None:
        bot = Bot.get_or_none(name=name, token=token)
        if bot is None:
            return None
        return bot.id
    
    @db.atomic()
    def register(self, name: str, token: str) -> int | None:
        try:
            return Bot.create(name=name, token=token).id
        except:
            return None

    def _get_chat_bot(self, chat_id: int, bot_id: int) -> tuple[Chat, Bot, ChatBot]:
        return (chat := Chat.get_by_id(chat_id)), (bot := Bot.get_by_id(bot_id)), ChatBot.get(chat=chat, bot=bot)

    def _get_chat_bot_or_parent(self, chat_id: int, bot_id: int) -> tuple[Chat, Bot, ChatBot, bool]:
        chat = Chat.get_by_id(chat_id)
        bot = Bot.get_by_id(bot_id)
        try:
            chat_bot = ChatBot.get(chat=chat, bot=bot)
        except:
            if (parent_chat := chat.parent) is None:
                raise
            if (parent_chat_bot := ChatBot.get_or_none(chat=parent_chat, bot=bot)) is None:
                raise
            return chat, bot, parent_chat_bot
        return chat, bot, chat_bot

    @db.atomic()
    def join(self, bot_id: int, chat_id: int) -> bool:
        try:
            chat = Chat.get_by_id(chat_id)
            bot = Bot.get_by_id(bot_id)
            ChatBot.get_or_create(chat=chat, bot=bot)
            return True
        except:
            return False

    @db.atomic()
    def quit(self, bot_id: int, chat_id: int) -> bool:
        try:
            chat, bot, chat_bot = self._get_chat_bot(chat_id, bot_id)
            chat_bot.delete_instance()
            return True
        except:
            return False

    @db.atomic()
    def kick(self, bot_id: int, kicked_user_id: int, chat_id: int) -> bool:
        try:
            chat  = self._get_chat_bot_or_parent(chat_id, bot_id)[0]
            kicked_user = User.get(id=kicked_user_id)
            kicked_chat_user = ChatUser.get(chat=chat, user=kicked_user)
            kicked_chat_user.delete_instance()
            return True
        except:
            return False

    @db.atomic()
    def rename(self, bot_id: int, new_name: str, chat_id: int) -> bool:
        try:
            chat  = self._get_chat_bot_or_parent(chat_id, bot_id)[0]
            chat.name = new_name
            chat.save()
            return True
        except:
            return False

    @db.atomic()
    def check_send(self, bot_id: int, chat_id: int) -> bool:
        try:
            self._get_chat_bot_or_parent(chat_id, bot_id)
            return True
        except:
            return False

    def check_create_session(self, bot_id: int, chat_id: int) -> bool:
        return self.check_send(bot_id, chat_id)

    @db.atomic()
    def modify_user_permission(self, chat_id: int, bot_id: int, modified_user_id: int, name: str, value: bool) -> bool:
        try:
            chat = self._get_chat_bot_or_parent(chat_id, bot_id)[0]
            modified_user = User.get_by_id(modified_user_id)
            modified_chat_user = ChatUser.get(chat=chat, user=modified_user)
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
    def modify_permission(self, chat_id: int, bot_id: int, name: str, value: bool) -> bool:
        try:
            chat = self._get_chat_bot_or_parent(chat_id, bot_id)[0]
            if name not in all_chat_permissions:
                return False
            # Maybe dangerous
            setattr(chat, name, value)
            chat.save()
            return True
        except:
            return False

    @db.atomic()
    def list_chat(self, id: int) -> list[tuple[int, str, int | None]]:
        # after json.dumps, tuple returned will become json Array
        try:
            bot = Bot.get_by_id(id)
            chat_bots = bot.chat_bots.join(Chat).select(Chat.id, Chat.name, Chat.parent).execute()
            return [(chat_bot.chat.id, chat_bot.chat.name, None if chat_bot.chat.parent is None else chat_bot.chat.parent.id) for chat_bot in chat_bots]
        except:
            return []

if __name__ == "__main__":
    db.create_tables([User, Chat, ChatUser, Bot, ChatBot])
    server = RpcServiceFactory("bot")
    server.register(Main())
    server.connect()
