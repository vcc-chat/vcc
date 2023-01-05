import sys
import threading


import prompt_toolkit
from prompt_toolkit import Application, HTML
from prompt_toolkit.buffer import Buffer
from prompt_toolkit.filters import Condition
from prompt_toolkit.key_binding.bindings.focus import focus_next, focus_previous
from prompt_toolkit.layout.containers import (
    VSplit,
    HSplit,
    Window,
    FloatContainer,
    Float,
    to_container,
)
from prompt_toolkit.layout.controls import BufferControl, FormattedTextControl
from prompt_toolkit.layout.layout import Layout
from prompt_toolkit.layout import ScrollablePane
from prompt_toolkit.widgets import TextArea, Button, Dialog, Label
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.layout.dimension import D

import vcc
import asyncio
import nest_asyncio

nest_asyncio.apply()
def init():
    global vcc_client
    vcc_client = vcc.RpcExchanger()
    asyncio.get_event_loop().run_until_complete(vcc_client.__aenter__())

def async_wrapper(func):
    """used to convert async function to normal function"""
    evloop = asyncio.get_event_loop()

    def wrapper(*args):
        return evloop.run_until_complete(func(*args))

    return wrapper


async def show_dialog_as_float(app, dialog):
    float_ = Float(content=dialog)
    root_container = app.layout.container
    root_container.floats.insert(0, float_)
    focused_before = app.layout.current_window
    app.layout.focus(dialog)
    result = await dialog.future
    app.layout.focus(focused_before)

    if float_ in root_container.floats:
        root_container.floats.remove(float_)
    return result


class TextInputDialog:
    def __init__(self, title="", label_text="", completer=None):
        self.future = asyncio.Future()

        def accept_text(buf):
            self.future.set_result(self.text_area.text)
            buf.complete_state = None
            return True

        def accept():
            self.future.set_result(self.text_area.text)

        def cancel():
            self.future.set_result(None)

        self.text_area = TextArea(
            completer=completer,
            multiline=False,
            width=D(preferred=40),
            accept_handler=accept_text,
        )

        ok_button = Button(text="OK", handler=accept)
        cancel_button = Button(text="Cancel", handler=cancel)

        self.dialog = Dialog(
            title=title,
            body=HSplit([Label(text=label_text), self.text_area]),
            buttons=[ok_button, cancel_button],
            width=D(preferred=80),
            modal=True,
        )

    def __pt_container__(self):
        return self.dialog


class mainapp:
    def __init__(self, protocol):
        self.protocol = protocol

    async def message_reciver(self):
        async for msg in self.client:

            if msg[0] != "event":
                username, msg, chat, session = msg[1:]
                if chat == self.current_chat[0]:
                    text = HTML(f"<ansiblue>{username}</ansiblue>:\n    {msg}\n")
                    lens = len(text.value.split("\n")) - 1
                    item = Window(
                        height=lens, content=FormattedTextControl(text, focusable=False)
                    )
                    self.chatbox.children.append(item)
                    curr = self.app.layout.current_window
                    self.app.layout.focus(item)
                    self.app._redraw()
                    self.app.layout.focus(curr)
                    self.app._redraw()
            if msg[0] == "event":
                print(11)

    def change_chat(self, chatid):
        if self.current_chat != chatid:
            self.current_chat = chatid
            self.chatbox.children = []
        self.app.layout.focus(self.chatbar)
        self.app._redraw()

    async def run(self):
        async with vcc_client.create_client() as client:
            client: vcc.RpcExchangerClient
            self.client = client
            login_success = await client.login(
                self.protocol.session.username, self.protocol.session.password
            )
            if not login_success:
                prompt_toolkit.print_formatted_text("oops! your password may be worong")
                return
            chatbar = TextArea(
                multiline=False,
                wrap_lines=True,
                accept_handler=self.send_message,
                height=20,
                read_only=Condition(lambda: not bool(self.current_chat)),
            )
            self.chatbar=chatbar
            asyncio.create_task(self.message_reciver())

            chat,children= await self.update_chatlist(init=True)
            if chat:
                self.current_chat = chat[0]
            else:
                self.current_chat = None
            self.chatlist =HSplit(children)

            self.chatbox = HSplit([])

            root_container = VSplit(
                [
                    HSplit(
                        [
                            ScrollablePane(content=self.chatlist),
                            Button(
                                width=20, text="Create chat", handler=self.create_chat
                            ),
                        ]
                    ),
                    Window(width=1, char="|"),
                    HSplit(
                        [
                            ScrollablePane(content=self.chatbox, show_scrollbar=False),
                            Window(height=1, char="-"),
                            chatbar,
                        ]
                    ),
                ]
            )
            root_container = FloatContainer(root_container, floats=[])
            kb = KeyBindings()
            kb.add("tab")(focus_next)
            kb.add("s-tab")(focus_previous)
            kb.add("c-c")(lambda ev: ev.app.exit())
            layout = Layout(root_container)
            app = prompt_toolkit.Application(
                full_screen=True, layout=layout, mouse_support=True, key_bindings=kb
            )
            self.app = app
            app: prompt_toolkit.Application

            await app.run_async()

    @async_wrapper
    async def send_message(self, buffer: Buffer):
        if buffer.text == "":
            return
        await self.client.send(buffer.text, self.current_chat[0])

    @async_wrapper
    async def create_chat(self):
        dialog = TextInputDialog("Create chat")
        ret = await show_dialog_as_float(self.app, dialog)
        id = await self.client.chat_create(ret)
        await self.client.chat_join(id)

    async def update_chatlist(self,init=False):
        chat = await self.client.chat_list()
        children= map(
            lambda x: to_container(
                Button(width=20, text=x[1], handler=lambda: self.change_chat(x))
            ),
            chat
        )
        if init:
            return chat,children
        self.chatlist.children=children
        return chat

if __name__ == "__main__":
    init()
    session = type("", (), {"username": sys.argv[1], "password": sys.argv[2]})()
    protocol = type("", (), {"session": session})()
    asyncio.run(mainapp(protocol).run())
