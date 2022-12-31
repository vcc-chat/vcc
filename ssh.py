#!/usr/bin/env python

# Copyright (c) Twisted Matrix Laboratories.
# See LICENSE for details.

import sys

from zope.interface import implementer
import asyncio
import threading
from twisted.conch import avatar
from twisted.conch.checkers import InMemorySSHKeyDB, SSHPublicKeyChecker
from twisted.conch.ssh import connection, factory, keys, session, userauth
from twisted.conch.ssh.transport import SSHServerTransport
from twisted.cred import portal, credentials
from twisted.cred.checkers import ICredentialsChecker, credentials
from twisted.internet import protocol, reactor, defer
from twisted.python import components, log, failure

from prompt_toolkit.input import create_pipe_input
from prompt_toolkit.output.vt100 import Vt100_Output
from prompt_toolkit.application.current import AppSession, create_app_session
from prompt_toolkit.data_structures import Size
import prompt_toolkit

import vos

log.startLogging(sys.stderr)
asyncio.new_event_loop()
SERVER_RSA_PRIVATE = "ssh-keys/ssh_host_rsa_key"
SERVER_RSA_PUBLIC = "ssh-keys/ssh_host_rsa_key.pub"

CLIENT_RSA_PUBLIC = "ssh-keys/client_rsa.pub"

PRIMES = {
    2048: [
        (
            2,
            int(
                "2426544657763384657581346888965894474823693600310397077868393"
                "3705240497295505367703330163384138799145013634794444597785054"
                "5748125479903006919561762337599059762229781976243372717454710"
                "2176446353691318838172478973705741394375893696394548769093992"
                "1001501857793275011598975080236860899147312097967655185795176"
                "0369411418341859232907692585123432987448282165305950904719704"
                "0150626897691190726414391069716616579597245962241027489028899"
                "9065530463691697692913935201628660686422182978481412651196163"
                "9303832327425472811802778094751292202887555413353357988371733"
                "1585493104019994344528544370824063974340739661083982041893657"
                "4217939"
            ),
        )
    ],
    4096: [
        (
            2,
            int(
                "8896338360072960666956554817320692705506152988585223623564629"
                "6621399423965037053201590845758609032962858914980344684974286"
                "2797136176274424808060302038380613106889959709419621954145635"
                "9745645498927756607640582597997083132103281857166287942205359"
                "2801914659358387079970048537106776322156933128608032240964629"
                "7706526831155237865417316423347898948704639476720848300063714"
                "8566690545913773564541481658565082079196378755098613844498856"
                "5501586550793900950277896827387976696265031832817503062386128"
                "5062331536562421699321671967257712201155508206384317725827233"
                "6142027687719225475523981798875719894413538627861634212487092"
                "7314303979577604977153889447845420392409945079600993777225912"
                "5621285287516787494652132525370682385152735699722849980820612"
                "3709076387834615230428138807577711774231925592999456202847308"
                "3393989687120016431260548916578950183006118751773893012324287"
                "3304901483476323853308396428713114053429620808491032573674192"
                "3854889258666071928702496194370274594569914312983133822049809"
                "8897129264121785413015683094180147494066773606688103698028652"
                "0892090232096545650051755799297658390763820738295370567143697"
                "6176702912637347103928738239565891710671678397388962498919556"
                "8943711148674858788771888256438487058313550933969509621845117"
                "4112035938859"
            ),
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

    publicKeys = {b"ssh-ed25519": keys.Key.fromFile(SERVER_RSA_PUBLIC)}

    def getPrivateKeys(self):
        return {b"ssh-ed25519": keys.Key.fromFile(SERVER_RSA_PRIVATE)}

    def getPrimes(self):
        return PRIMES


if __name__ == "__main__":
    reactor.listenTCP(5022, ExampleFactory())
    reactor.run()
