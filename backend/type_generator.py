try:
    from .methods import Methods
except ImportError:
    from methods import Methods

import inspect
import types
import typing
import os
from pathlib import Path


def python_type_to_typescript(cls):
    simple_type_result = {
        int: "number",
        str: "string",
        bool: "boolean",
        None: "null",
        types.NoneType: "null",
        typing.Any: "any",
        typing.Never: "never",
    }.get(cls)
    if simple_type_result is not None:
        return simple_type_result

    origin = typing.get_origin(cls)
    args = typing.get_args(cls)
    if typing.is_typeddict(cls):
        return (
            (
                "{"
                + ", ".join(
                    [
                        f""""{key}": {python_type_to_typescript(value)}"""
                        for key, value in cls.__annotations__.items()
                    ]
                )
                + "}"
            )
            if cls.__annotations__
            else "Record<string, never>"
        )
    if origin is dict:
        return f"Record<{', '.join([python_type_to_typescript(arg) for arg in typing.get_args(cls)])}>"
    if origin is typing.Union or origin is types.UnionType:
        return " | ".join(
            [python_type_to_typescript(arg) for arg in typing.get_args(cls)]
        )
    if origin is typing.Literal:
        return " | ".join(['"' + arg + '"' for arg in typing.get_args(cls)])
    if origin is list:
        return f"Array<{python_type_to_typescript(args[0])}>"
    if origin is tuple:
        return f"[{', '.join([python_type_to_typescript(arg) for arg in args])}]"
    # return cls
    raise Exception(cls)


methods = object.__new__(Methods)
funcs = [
    getattr(methods, key)
    for key in dir(methods)
    if key[0] != "_" and not isinstance(getattr(methods, key), type)
]
signatures: list[tuple[str, inspect.Signature]] = [
    (func.__name__, inspect.signature(func)) for func in funcs
]
texts = [
    f""""{name}": (params: {("{" + ", ".join(
        [
            f"{name}: {python_type_to_typescript(parameter.annotation)}"
            for name, parameter in signature.parameters.items()
        ]
    ) + "}") if signature.parameters else "Record<string, never>"}) => {python_type_to_typescript(signature.return_annotation)}"""
    for name, signature in signatures
]

if __name__ == "__main__":
    print("{" + ", ".join(texts) + "}")
    path = os.getenv("WEB_VCC_TYPE_GENERATOR_WRITE_PATH")
    (
        Path(path)
        if path is not None
        else Path(__file__).parent.parent / "frontend" / "src" / "methodtype.ts"
    ).write_text("export type MethodType = {" + ", ".join(texts) + "}")
