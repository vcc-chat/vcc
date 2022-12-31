import sys
import threading


import prompt_toolkit
from prompt_toolkit import Application,HTML
from prompt_toolkit.buffer import Buffer
from prompt_toolkit.key_binding.bindings.focus import focus_next, focus_previous
from prompt_toolkit.layout.containers import VSplit, HSplit, Window, to_container
from prompt_toolkit.layout.controls import BufferControl, FormattedTextControl
from prompt_toolkit.layout.layout import Layout
from prompt_toolkit.layout import ScrollablePane
from prompt_toolkit.widgets import TextArea, Button
from prompt_toolkit.key_binding import KeyBindings


import vcc
import asyncio
import nest_asyncio
nest_asyncio.apply()
vcc_client = vcc.RpcExchanger()
asyncio.get_event_loop().run_until_complete(vcc_client.__aenter__())


class mainapp():
    def __init__(self,protocol):
        self.protocol=protocol
    async def message_reciver(self):
        async for username, msg, chat in self.client:
            if chat==self.current_chat[0]:
                text=HTML(f'<ansiblue>{username}</ansiblue>:\n    {msg}\n')
                lens=len(text.value.split("\n"))-1
                item=Window(height=lens,content=FormattedTextControl(text,focusable=False))
                self.chatbox.children.append(item)
                curr=self.app.layout.current_window
                self.app.layout.focus(item)
                self.app._redraw()
                self.app.layout.focus(curr)
                self.app._redraw()
    def change_chat(self,chatid):
        if self.current_chat==chatid:
            return

        self.current_chat=chatid
        self.chatbox.children=[]
        self.app._redraw()
    async def run(self):
        async with vcc_client.create_client() as client:
            client: vcc.RpcExchangerClient
            self.client=client
            login_success = await client.login(self.protocol.session.username, self.protocol.session.password)
            if not login_success:
                prompt_toolkit.print_formatted_text("oops! your password may be worong")
                return
            await client.chat_join(1)
            chatbar = TextArea(multiline=False, wrap_lines=True, height=20)
            asyncio.create_task(self.message_reciver())

            chat=await client.chat_list_somebody_joined()

            chatlist = HSplit(
                map(
                    lambda x: to_container(Button(text=x[1],handler=lambda :self.change_chat(x))),
                    chat,
                )
            )

            self.current_chat=chat[0]


            self.chatbox=HSplit([Window()])

            root_container = VSplit(
                [
                    ScrollablePane(content=chatlist),
                    Window(width=1, char="|"),
                    HSplit(
                        [
                            ScrollablePane(content=self.chatbox,show_scrollbar=False),
                            Window(height=1, char="-"),
                            chatbar,
                        ]
                    ),
                ]
            )
            def send_message(buffer):
                async def _send_message(buffer: Buffer):
                    if buffer.text=="":
                        return
                    await self.client.send(buffer.text,self.current_chat[0])
                evloop=asyncio.get_event_loop()
                evloop.run_until_complete(_send_message(buffer))
            chatbar.accept_handler=send_message
            kb = KeyBindings()
            kb.add("tab")(focus_next)
            kb.add("s-tab")(focus_previous)
            kb.add("c-c")(lambda ev: ev.app.exit())
            layout = Layout(root_container)
            # buffer1.
            app = prompt_toolkit.Application(
                full_screen=True, layout=layout, mouse_support=True, key_bindings=kb
            )

            self.app=app
            app: prompt_toolkit.Application
            await app.run_async()
if __name__=="__main__":
    session=type("",(),{"username":sys.argv[1],"password":sys.argv[2]})()
    protocol=type("",(),{"session":session})()
    asyncio.run(mainapp(protocol).run())
