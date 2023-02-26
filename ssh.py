#!/usr/bin/env python

import sys
import os
import asyncio
import threading
import logging

import asyncssh
import prompt_toolkit
from prompt_toolkit.input import create_pipe_input
from prompt_toolkit.output.vt100 import Vt100_Output
from prompt_toolkit.application.current import AppSession, create_app_session
from prompt_toolkit.data_structures import Size

import vos

asyncio.new_event_loop()


if not (DATAROOT := os.environ.get("VOS_DATAROOT")):
    DATAROOT = "./"
SERVER_KEY_PRIVATE = DATAROOT + "/ssh_host_key"
SERVER_KEY_PUBLIC = DATAROOT + "/ssh_host_key.pub"
if not os.path.exists(SERVER_KEY_PRIVATE) or not os.path.exists(SERVER_KEY_PUBLIC):
    os.system(f"ckeygen -t ED25519 -f {SERVER_KEY_PRIVATE} --no-passphrase   -q")
import traceback
from typing import Any, Awaitable, Callable, Optional, TextIO, cast

class VccSSHSession(asyncssh.SSHServerSession):  # type: ignore
    def __init__(self, server, enable_cpr: bool):
        self.enable_cpr = enable_cpr
        self.interact_task = None
        self._chan = None
        self.app_session = None
        self.server = server
        self._input: Optional[PipeInput] = None
        self._output: Optional[Vt100_Output] = None

        # Output object. Don't render to the real stdout, but write everything
        # in the SSH channel.
        class Stdout:
            def write(s, data: str) -> None:
                try:
                    if self._chan is not None:
                        self._chan.write(data.replace("\n", "\r\n"))
                except BrokenPipeError:
                    pass  # Channel not open for sending.

            def isatty(s) -> bool:
                return True

            def flush(s) -> None:
                pass

            @property
            def encoding(s) -> str:
                assert self._chan is not None
                return str(self._chan._orig_chan.get_encoding()[0])

        self.stdout = cast(TextIO, Stdout())

    def _get_size(self) -> Size:
        """
        Callable that returns the current `Size`, required by Vt100_Output.
        """
        if self._chan is None:
            return Size(rows=20, columns=79)
        else:
            width, height, pixwidth, pixheight = self._chan.get_terminal_size()
            return Size(rows=height, columns=width)

    def connection_made(self, chan: Any) -> None:
        self._chan = chan

    def shell_requested(self) -> bool:
        return True

    def session_started(self) -> None:
        self.interact_task = asyncio.get_event_loop().create_task(self._interact())

    async def _interact(self) -> None:
        
        if self._chan is None:
            # Should not happen.
            raise Exception("`_interact` called before `connection_made`.")
        if hasattr(self._chan, "set_line_mode") and self._chan._editor is not None:
            # Disable the line editing provided by asyncssh. Prompt_toolkit
            # provides the line editing.
            self._chan.set_line_mode(False)
        term = self._chan.get_terminal_type()
        self._output = Vt100_Output(
            self.stdout, self._get_size, term=term
        )
        print(self._output)
        with create_pipe_input() as self._input:
            with create_app_session(input=self._input, output=self._output) as session:
                self.app_session = session
                try:
                    userinfo={}
                    userinfo['username']=self.server.username
                    if self.server.username!="oauth":
                        if hasattr(self.server,"password"):
                            userinfo['password']=self.server.password
                    await vos.mainapp(userinfo).run()
                except BaseException:
                    traceback.print_exc()
                finally:
                    # Close the connection.
                    self._chan.close()
                    self._input.close()

    def terminal_size_changed(
        self, width: int, height: int, pixwidth: object, pixheight: object
    ) -> None:
        # Send resize event to the current application.
        if self.app_session and self.app_session.app:
            self.app_session.app._on_resize()

    def data_received(self, data: str, datatype: object) -> None:
        if self._input is None:
            # Should not happen.
            return

        self._input.send_text(data)


class PromptToolkitSSHServer(asyncssh.SSHServer):
    def __init__(self):
        self.enable_cpr = True
    def connection_made(self,conn:asyncssh.SSHServerConnection):
        self._conn=conn
    def begin_auth(self, username: str) -> bool:
        self.username = username
        if username=="oauth":
            return False
        return True
    def password_auth_supported(self) -> bool:
        return True

    def validate_password(self, username: str, password: str) -> bool:
        self.password = password
        return True

    def session_requested(self):
        print(1234)
        return VccSSHSession(self, enable_cpr=True)


if __name__ == "__main__":
    vos.init()
    loop = asyncio.get_event_loop()

    loop.run_until_complete(
        asyncssh.create_server(
            lambda: PromptToolkitSSHServer(),
            "",
            5022,
            server_host_keys=[SERVER_KEY_PRIVATE],
        )
    )
    loop.run_forever()
