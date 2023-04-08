from __future__ import annotations

import inspect
import logging

from functools import wraps
from typing import TYPE_CHECKING, Callable, TypeVar

if TYPE_CHECKING:
    from .vcc import RpcExchangerBaseClient

T = TypeVar("T", bound=Callable)

log = logging.getLogger("vcc")

def check(*, auth: bool=True, joined: str | None=None, not_joined: str | None=None):
    def decorator(func: T) -> T:
        signature = inspect.signature(func)
        @wraps(func)
        async def wrapper(self: RpcExchangerBaseClient, *args, **kwargs):
            bound_signature = signature.bind(self, *args, **kwargs)
            if auth:
                self.check_authorized()
            if joined is not None:
                await self.check_joined(bound_signature.arguments[joined])
            if not_joined is not None:
                await self.check_not_joined(bound_signature.arguments[not_joined])
            return await func(self, *args, **kwargs)
        return wrapper # type: ignore
    return decorator

def rpc_request(service: str | None=None, *, id_arg: str | None=None):
    def decorator(func: T) -> T:
        _service = service if service is not None else "/".join(func.__name__.split("_", 1))
        signature = inspect.signature(func)
        @wraps(func)
        def wrapper(self: RpcExchangerBaseClient, *args, **kwargs):
            log.debug(f"{service=} {id_arg=} {_service=} {args=} {kwargs=}")
            bound_signature = signature.bind(self, *args, **kwargs)
            bound_signature.apply_defaults()
            arguments = bound_signature.arguments
            if id_arg is not None:
                arguments.update({
                    id_arg: self._id
                })
            del arguments["self"]
            return self._exchanger.rpc_request(_service, arguments)
        return wrapper # type: ignore
    return decorator