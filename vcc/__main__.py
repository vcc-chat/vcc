from .service import *

try:
    import uvloop
    uvloop.install()
except ImportError:
    pass
logging.basicConfig(level=logging.DEBUG)
asyncio.run(RpcServiceFactory().alisten())