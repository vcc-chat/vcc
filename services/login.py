#!/usr/bin/env python

import base

class Main:
    def login(self, username, password):
        users = {
            "test1": "passwd1",
            "test2": "passwd2",
        }
        return username in users and users[username] == password

if __name__ == "__main__":
    server = base.RpcServer()
    server.register(Main())
    server.connect()
