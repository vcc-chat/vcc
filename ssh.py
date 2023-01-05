#!/usr/bin/env python

# Copyright (c) Twisted Matrix Laboratories.
# See LICENSE for details.

import sys
import os
import asyncio
import threading

from zope.interface import implementer

from twisted.conch import avatar
from twisted.conch.checkers import InMemorySSHKeyDB, SSHPublicKeyChecker
from twisted.conch.ssh import connection, factory, keys, session, userauth
from twisted.conch.ssh.transport import SSHServerTransport
from twisted.cred import portal, credentials
from twisted.cred.checkers import ICredentialsChecker, credentials
from twisted.internet import protocol, reactor, defer
from twisted.python import components, log, failure

import prompt_toolkit
from prompt_toolkit.input import create_pipe_input
from prompt_toolkit.output.vt100 import Vt100_Output
from prompt_toolkit.application.current import AppSession, create_app_session
from prompt_toolkit.data_structures import Size

import vos

log.startLogging(sys.stderr)
asyncio.new_event_loop()


if not (DATAROOT:=os.environ.get("VOS_DATAROOT")):
    DATAROOT="./"
SERVER_KEY_PRIVATE = DATAROOT+"ssh_host_key"
SERVER_KEY_PUBLIC = DATAROOT+"ssh_host_key.pub"
SERVER_PRIME = DATAROOT+"prime"
if not os.path.exists(SERVER_KEY_PRIVATE) or  not os.path.exists(SERVER_KEY_PUBLIC):
    os.system(f'ckeygen -t ED25519 -f {SERVER_KEY_PRIVATE} --no-passphrase   -q')
if not os.path.exists(SERVER_PRIME):
    print("Generating primes, this may takes a while")
    os.system(f'sh scripts/generate_prime.sh {SERVER_PRIME}')

PRIMES = {
    2048: [
        (
            2,
            int(open(DATAROOT+"/prime/2048").read()),
        )
    ],
    4096: [
        (
            2,
            int(open(DATAROOT+"/prime/4096").read()),
        )
    ],
}


@implementer(ICredentialsChecker)
class VccAuth:
    credentialInterfaces = (
        credentials.IUsernamePassword,
        credentials.IUsernameHashedPassword,
    )

    def _cbPasswordMatch(self, matched, username):
        return username

    def requestAvatarId(self, credentials):
        return defer.maybeDeferred(
            credentials.checkPassword, credentials.checkPassword
        ).addCallback(
            self._cbPasswordMatch, (credentials.username, credentials.password)
        )


class ExampleAvatar(avatar.ConchUser):
    def __init__(self, credential):
        avatar.ConchUser.__init__(self)
        self.username = credential[0]
        self.password = credential[1]
        self.channelLookup.update({b"session": session.SSHSession})


@implementer(portal.IRealm)
class ExampleRealm:
    def requestAvatar(self, avatarId, mind, *interfaces):
        print("a", avatarId)
        return interfaces[0], ExampleAvatar(avatarId), lambda: None


class EchoProtocol(protocol.Protocol):
    def __init__(self, session):
        self.session = session
        self.input = None

        class Stdout:
            def write(s, data: str) -> None:
                try:
                    if self.transport is not None:
                        #data=data.replace('\n', "\r\n")
                        self.transport.write(data)
                except BrokenPipeError:
                    pass  # Channel not open for sending.

            def isatty(s) -> bool:
                return True

            def flush(s) -> None:
                pass

            encoding = "UTF8"  # I think it must be utf8

        self.stdout = Stdout()
        self.output = Vt100_Output(
            self.stdout,
            lambda: Size(rows=(_s := session.windowSize)[0], columns=_s[1]),
            term=self.session.term,
        )

    async def mainapp_wrapper(self):
        with create_pipe_input() as input:
            self.input = input
            with create_app_session(input=self.input, output=self.output) as session:
                self.appsession = session
                mainapp=vos.mainapp(self)
                self.mainapp=mainapp
                try:
                    await mainapp.run()
                except EOFError:
                    pass
        self.transport.connectionLost()
    def connectionMade(self):
        loop = asyncio.get_event_loop()
        threading._start_new_thread(asyncio.run, (self.mainapp_wrapper(),))
        # loop.run_until_complete(self.mainapp())

    def dataReceived(self, data):
        try:
            self.input.send_text(data.decode("UTF8"))
        except OSError:
            self.transport.connectionLost()

    def change_size(self, size):
        self.appsession.app._on_resize()


@implementer(session.ISession, session.ISessionSetEnv)
class ExampleSession:
    def __init__(self, avatar):
        self.username = avatar.username.decode("UTF8")
        self.password = avatar.password.decode("UTF8")

    def getPty(self, term, windowSize, attrs):
        self.term = term
        self.windowSize = windowSize

    def setEnv(self, name, value):
        pass

    def windowChanged(self, size):
        self.windowSize = size
        self.protocol.change_size(size)

    def execCommand(self, proto, cmd):
        raise Exception("not executing commands")

    def openShell(self, transport):
        protocol = EchoProtocol(self)
        protocol.makeConnection(transport)
        transport.makeConnection(session.wrapProtocol(protocol))
        self.protocol = protocol

    def eofReceived(self):
        pass

    def closed(self):
        pass


components.registerAdapter(
    ExampleSession, ExampleAvatar, session.ISession, session.ISessionSetEnv
)


class ExampleFactory(factory.SSHFactory):
    protocol = SSHServerTransport
    services = {
        b"ssh-userauth": userauth.SSHUserAuthServer,
        b"ssh-connection": connection.SSHConnection,
    }

    def __init__(self):
        self.portal = portal.Portal(ExampleRealm(), [VccAuth()])

    publicKeys = {b"ssh-ed25519": keys.Key.fromFile(SERVER_KEY_PUBLIC)}

    def getPrivateKeys(self):
        return {b"ssh-ed25519": keys.Key.fromFile(SERVER_KEY_PRIVATE)}

    def getPrimes(self):
        return PRIMES


if __name__ == "__main__":
    vos.init()
    reactor.listenTCP(5022, ExampleFactory())
    reactor.run()
