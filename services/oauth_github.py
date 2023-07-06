import typing
import uuid
import asyncio

from os import getenv
import os
import aiohttp.web
from aiohttp import ClientSession, request
import base
import threading
from base import ServiceExport as export
from urllib3.util import parse_url

from aiohttp.web import Response

GH_CLIENTID = getenv("OAUTH_GH_CLIENTID")
GH_CLIENTSEC = getenv("OAUTH_GH_CLIENTSEC")
GH_CALLBACKURL = getenv("OAUTH_GH_CALLBACKURL")
GH_URL_TEMPLATE = "https://github.com/login/oauth/authorize?client_id={clientid}&client_secret={clientsec}&redirect_uri={callbackurl}/{requestid};"
GH_ACCESS_URL_TEMPLATE = "https://github.com/login/oauth/access_token/?client_id={clientid}&client_secret={clientsec}&code={code}&redirect_uri={callbackurl}/{requestid}"
GH_GET_USER = "https://api.github.com/user"
HTTP_PORT = int(getenv("OAUTH_GH_HTTP_PORT"))
HTTP_RESPONSE_HTML = """
<h1>Authorize finished! You can close this page</h1>
"""
HTTP_RESPONSE_TIMEOUT = """
<h1>Authorize timeout or request invald! Please do it again</h1>
"""


def oauthGhHttp(table: dict[str, asyncio.Future] = {}):
    app = aiohttp.web.Application()
    route = aiohttp.web.RouteTableDef()

    async def callback_url(request):
        requestid = request.match_info["requestid"]
        print(requestid)
        if not requestid in table:
            return Response(text=HTTP_RESPONSE_TIMEOUT, content_type="text/html")
        async with ClientSession(headers={"Accept": "application/json"}) as client:
            code = request.query["code"]
            access = await client.post(
                GH_ACCESS_URL_TEMPLATE.format(
                    **{
                        "clientid": GH_CLIENTID,
                        "clientsec": GH_CLIENTSEC,
                        "callbackurl": GH_CALLBACKURL,
                        "requestid": requestid,
                        "code": code,
                    }
                )
            )
            accesstoken = (await access.json())["access_token"]
            userinfo = await client.get(
                GH_GET_USER, headers={"Authorization": "token " + accesstoken}
            )
            userinfo = await userinfo.json()
            table[requestid].set_result({"id":userinfo["id"],"nickname":userinfo["login"]})
        return Response(text=HTTP_RESPONSE_HTML, content_type="text/html")
    app.add_routes(
        [
            aiohttp.web.get(
                os.path.join(parse_url(GH_CALLBACKURL).path, "{requestid}"), callback_url
            )
        ]
    )
    return lambda: aiohttp.web._run_app(app, port=HTTP_PORT)


class oauthGithub(metaclass=base.ServiceMeta):
    def __init__(self) -> None:
        self.table: dict[str, asyncio.Future] = {}
        self.http_server = oauthGhHttp(table=self.table)

    @export(thread=False)
    def request_oauth(self):
        requestid = str(uuid.uuid4())
        self.table[requestid] = asyncio.get_event_loop().create_future()
        asyncio.get_event_loop().call_later(60 * 5, self.clean_future, requestid)
        url = GH_URL_TEMPLATE.format(
            **{
                "clientid": GH_CLIENTID,
                "clientsec": GH_CLIENTSEC,
                "callbackurl": GH_CALLBACKURL,
                "requestid": requestid,
            }
        )
        return url, requestid

    @export(async_mode=True)
    async def login_oauth(self, requestid):
        return await self.table[requestid]

    def clean_future(self, requestid):
        print("timeout")
        if requestid in self.table and self.table[requestid].done():
            return
        self.table[requestid].set_result(-1)
        del self.table[requestid]


if __name__ == "__main__":
    asyncio.set_event_loop(loop := asyncio.new_event_loop())
    server = base.RpcServiceFactory()
    service = oauthGithub()
    server.register(service, name="oauth_github")
    loop.create_task(server.aconnect())
    loop.create_task(service.http_server())
    loop.run_forever()
