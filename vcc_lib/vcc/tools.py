from __future__ import annotations

import inspect
import logging
import os
import contextvars
import copy
from functools import wraps
from typing import TYPE_CHECKING, Any, Awaitable, Callable, Literal, TypeVar, TypedDict

if TYPE_CHECKING:
    from .vcc import RpcExchangerBaseClient

T = TypeVar("T", bound=Callable)

log = logging.getLogger("vcc")
log.addHandler(logging.NullHandler())

ChatUserPermissionName = Literal[
    "kick",
    "rename",
    "invite",
    "modify_permission",
    "send",
    "create_sub_chat",
    "create_session",
    "banned",
    "change_nickname",
]
ChatPermissionName = Literal["public"]


class RpcException(Exception):
    pass


class ChatAlreadyJoinedError(RpcException):
    pass


class ChatNotJoinedError(RpcException):
    pass


class UnknownError(RpcException):
    pass


class NotAuthorizedError(RpcException):
    pass


class PermissionDeniedError(RpcException):
    pass


class ProviderNotFoundError(RpcException):
    pass


class RedisMessage(TypedDict):
    username: str
    msg_type: str
    payload: Any
    # TODO: add NotRequired after upgrading to python3.11
    session: str
    chat: int
    uid: int
    id: str


Event = Literal["join", "quit", "kick", "rename", "invite"]

MessageCallback = Callable[
    [int, str, str, int, str | None, str], None | Awaitable[None]
]
EventCallback = Callable[[Event, Any, int], None | Awaitable[None]]


class RedisEvent(TypedDict):
    type: Event
    data: Any
    chat: int


log = logging.getLogger("vcc")
log.addHandler(logging.NullHandler())


class ContextObject(object):
    def __init__(self):
        object.__setattr__(
            self, "_context", contextvars.ContextVar("context", default={})
        )

    def __getattr__(self, name):
        return self._context.get().get(name, None)

    def __setattr__(self, name, value):
        self._context.set(self._context.get() | {name: value})


def check(
    *,
    auth: bool = True,
    joined: str | None = None,
    not_joined: str | None = None,
    error_return: Any = Exception,
):
    def decorator(func: T) -> T:
        signature = inspect.signature(func)

        @wraps(func)
        async def wrapper(self: RpcExchangerBaseClient, *args, **kwargs):
            bound_signature = signature.bind(self, *args, **kwargs)
            if auth:
                self.check_authorized()
            try:
                if joined is not None:
                    await self.check_joined(bound_signature.arguments[joined])
                if not_joined is not None:
                    await self.check_not_joined(bound_signature.arguments[not_joined])
            except RpcException as e:
                log.warning(e, exc_info=True)
                if error_return is Exception:
                    raise
                return copy.deepcopy(error_return)
            return await func(self, *args, **kwargs)

        return wrapper  # type: ignore

    return decorator


def rpc_request(_service: str | None = None, *, id_arg: str | None = None):
    def decorator(func: T) -> T:
        namespace, service = (
            _service.split("/", 1)
            if _service is not None
            else func.__name__.split("_", 1)
        )
        signature = inspect.signature(func)

        @wraps(func)
        def wrapper(self: RpcExchangerBaseClient, *args, **kwargs):
            log.debug(f"{namespace=} {service=} {id_arg=} {args=} {kwargs=}")
            bound_signature = signature.bind(self, *args, **kwargs)
            bound_signature.apply_defaults()
            arguments = bound_signature.arguments
            if id_arg is not None:
                arguments.update({id_arg: self._id})
            del arguments["self"]
            return self._exchanger.rpc_request(namespace, service, arguments)

        return wrapper  # type: ignore

    return decorator


def list_get_default(l, index, default=None):
    return l[index] if index < len(l) else default


def get_host() -> tuple[str, int]:
    if "RPCHOST" in os.environ:
        host = os.environ["RPCHOST"].split(":")
        return host[0], int(host[1])
    else:
        return ("localhost", 2474)

__all__ = [
    "check",
    "rpc_request",
    "get_host",
    "RpcException",
    "ChatAlreadyJoinedError",
    "ChatNotJoinedError",
    "UnknownError",
    "NotAuthorizedError",
    "PermissionDeniedError",
    "ProviderNotFoundError",
    "log",
    "ChatUserPermissionName",
    "ChatPermissionName",
    "Event",
    "MessageCallback",
    "EventCallback",
    "RedisEvent",
    "RedisMessage",
]
