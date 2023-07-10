import { useCallback, useEffect, useMemo, useRef } from "preact/hooks"
import type { ComponentChildren } from "preact"
import { useQueries } from "@tanstack/react-query"

import { Request } from "../config"
import useStore from "../store"

async function getMetaInfo(urlString: string) {
  const response = await fetch(urlString)
  if (!response.ok) {
    throw new Error("Invalid url")
  }
  const data = (await response.json()) as
    | {
        entry: string
        name: string
        type: "entry"
      }
    | {
        script: string
        name: string
        type: "script"
      }
  if (data.type == "script") {
    return { content: data.script, name: data.name }
  }
  const entryContent = await fetch(data.entry)
  if (!response.ok) {
    throw new Error("Invalid url")
  }
  return { content: await entryContent.text(), name: data.name }
}

const nonce = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
const csp = `default-src 'none'; worker-src blob:; script-src 'nonce-${nonce}';`

const workerInitCode = `(${function () {
  const receiveHooks: ((message: Request) => Request | null)[] = []
  const sendHooks: ((message: Request) => Request | null)[] = []
  const commandHooks: Record<string, (args: string[]) => Request | null> = {}
  const appHooks: Record<
    string,
    () => {
      html: string
    }
  > = {}
  self.addEventListener(
    "message",
    function (
      ev: MessageEvent<
        | {
            type: "message"
            msg: Request | null
            id: string
          }
        | {
            type: "send-message"
            msg: Request | null
            id: string
          }
        | {
            type: "command"
            command: string
            arguments: string[]
            id: string
          }
        | {
            type: "app"
            name: string
            id: string
          }
      >
    ) {
      const data = ev.data
      const { id } = data
      if (data.type == "message") {
        let { msg } = data
        for (const receiveHook of receiveHooks) {
          if (msg == null) break
          msg = receiveHook(msg)
        }
        self.postMessage({
          msg,
          id
        })
        return
      }
      if (data.type == "send-message") {
        let { msg } = data
        for (const sendHook of sendHooks) {
          if (msg == null) break
          msg = sendHook(msg)
        }
        self.postMessage({
          msg,
          id
        })
        return
      }
      if (data.type == "command") {
        const { command, arguments: args } = data
        let msg: Request | null = null
        if (command in commandHooks) {
          msg = commandHooks[command](args)
        }
        self.postMessage({
          msg,
          id
        })
        return
      }
      if (data.type == "app") {
        const { name } = data
        if (name in appHooks) {
          self.postMessage({
            msg: appHooks[name](),
            id
          })
        } else {
          self.postMessage({
            msg: null,
            id
          })
        }
      }
    }
  )

  self.URL.createObjectURL = () => {
    throw new Error("createObjectURL is not allowed")
  }

  function on(
    event: "receive" | "send" | `command:${string}` | `app:${string}`,
    func: (...args: any) => Request | null
  ) {
    if (event == "receive") {
      receiveHooks.push(func)
    } else if (event == "send") {
      sendHooks.push(func)
    } else if (event.startsWith("command")) {
      const command = /^command:(.*)$/.exec(event)![1]
      commandHooks[command] = func
    } else if (event.startsWith("app")) {
      const command = /^app:(.*)$/.exec(event)![1]
      appHooks[command] = func as any
    } else {
      throw new Error("Invalid event")
    }
  }

  const toReadOnlySet = new WeakSet<any>()
  const readOnlyMap = new WeakMap<any, any>()
  const readOnlySet = new WeakSet<any>()

  const ObjectClone = Object
  const freeze = Object.freeze
  const isFrozen = Object.isFrozen
  const ProxyClone = Proxy
  const reflectApply = Reflect.apply

  function toReadOnly(obj: any) {
    if (toReadOnlySet.has(obj)) return
    if ((typeof obj != "function" && typeof obj != "object") || obj == null) return
    toReadOnlySet.add(obj)
    const names = ObjectClone.getOwnPropertyNames(obj)
    if (names == undefined) {
      freeze(obj)
      return
    }
    for (const i of names) {
      try {
        obj[i] = readOnly(obj[i])
      } catch (e) {}
    }
    freeze(obj)
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const proxyFunction = () => {}

  function readOnly(obj: any): any {
    if ((typeof obj != "object" && typeof obj != "function") || obj == null) return obj
    const cachedResult = readOnlyMap.get(obj)

    if (cachedResult != undefined) return cachedResult
    if (readOnlySet.has(obj)) return obj
    if (isFrozen(obj)) return obj

    const handler: ProxyHandler<any> = {
      defineProperty: () => false,
      deleteProperty: () => false,
      get: (_, key) => readOnly(obj[key]),
      getOwnPropertyDescriptor(_, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(obj, key)
        if (!descriptor) return
        // Something strange but works
        descriptor.configurable = true
        return descriptor
      },
      getPrototypeOf() {
        return readOnly(Reflect.getPrototypeOf(obj))
      },
      has(_, key) {
        return Reflect.has(obj, key)
      },
      isExtensible: () => false,
      ownKeys() {
        return Reflect.ownKeys(obj)
      },
      preventExtensions: () => false,
      set: () => false,
      setPrototypeOf: () => false
    }

    if (typeof obj == "function") {
      Object.assign(handler, {
        apply(_, thisArg, argumentsList) {
          const result: any = reflectApply(obj, thisArg, argumentsList)
          if ((typeof result == "object" || typeof result == "function") && result != null) {
            toReadOnly(result.__proto__)
          }
          return result
        },
        construct(_, argumentsList, newTarget) {
          const result: any = Reflect.construct(obj, argumentsList, newTarget)
          if ((typeof result == "object" || typeof result == "function") && result != null) {
            toReadOnly(result.__proto__)
          }
          return result
        }
      } as ProxyHandler<any>)
    }

    const proxy = new ProxyClone(typeof obj == "function" ? proxyFunction : Object.create(null), handler)
    readOnlySet.add(proxy)
    readOnlyMap.set(obj, proxy)
    return proxy
  }

  ;(self as any).readOnly = readOnly
  ;(self as any).toReadOnly = toReadOnly
  ;(self as any).createGlobal = function () {
    const proxy = new Proxy(
      {
        on: readOnly(on)
      } as any,
      {
        get(target, key) {
          if (key == Symbol.unscopables) {
            return undefined
          }
          if (key in target) return target[key]
          const value: any = self[key as any]
          if (typeof value == "function") {
            return readOnly(value.bind(target))
          }
          return readOnly(self[key as any])
        },
        has() {
          return true
        }
      }
    )
    return proxy
  } as unknown as {
    on: typeof on
  } & typeof self

  for (const i of [Number, String, Function, Object, RegExp, Promise, Array, Symbol, BigInt]) {
    toReadOnly(i as any)
    toReadOnly((i as any).prototype)
  }
  for (const i of Object.getOwnPropertyNames(self)) {
    if (typeof self[i as any] == "function" && Object.getOwnPropertyNames(self[i as any]).length === 2) {
      self[i as any] = (self[i as any] as any).bind(self)
    }
  }
}})();`

function generateUUID() {
  if (location.protocol == "https:") return crypto.randomUUID()
  return URL.createObjectURL(new Blob()).slice(-36)
}

function createIframeSrc(originalScripts: string[]) {
  let scripts: string = workerInitCode
  for (const originalScript of originalScripts) {
    try {
      new Function(originalScript)
      scripts += `
        with (createGlobal()) {
          (function () {
            "use strict";
            const { Number, String, Function, Object, RegExp, Promise, Array, Symbol, Set, Map, Date, self } = this;
            ${originalScript}
          }).call(self)
        }
      `
    } catch (e) {
      // Plugin won't be load if there's syntax error
      console.error(new SyntaxError("The plugin is broken, it will not be load"))
    }
  }
  return (
    "data:text/html;charset=utf-8," +
    encodeURIComponent(
      `
        <!DOCTYPE html>
        <html>
          <head>
            <meta http-equiv="Content-Security-Policy" content="${csp}">
            <script nonce="${nonce}">
              (function () {
                var script = atob(${JSON.stringify(btoa(scripts))});
                var url = URL.createObjectURL(new Blob([script]), {
                  type: "application/javascript"
                });
                var worker = new Worker(url);
                worker.onmessage = function (ev) {
                  parent.postMessage(ev.data, "*")
                };
                window.onmessage = function (ev) {
                  worker.postMessage(ev.data)
                };
              })();
            </script>
          </head>
          <body></body>
        </html>
      `
        .replace(/ +/g, " ")
        .replace(/\n/g, "")
    )
  )
}

export function PluginProvider({ children }: { children: ComponentChildren }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const callbacksRef = useRef<Record<string, (ev: MessageEvent<{ id: string; msg: any }>) => void>>({})

  const setReceiveHook = useStore(state => state.setReceiveHook)
  const setSendHook = useStore(state => state.setSendHook)
  const setAppHook = useStore(state => state.setAppHook)

  const urls = useStore(state => state.pluginLinks)

  const codeQueries = useQueries({
    queries: urls.map(url => ({
      queryKey: ["plugin-code", url],
      queryFn: () => {
        return getMetaInfo(url)
      }
    }))
  })

  const complete = useMemo(() => codeQueries.reduce((a, b) => a && (b.isError || b.isSuccess), true), [codeQueries])

  useEffect(() => {
    const callbacks = callbacksRef.current
    function callback(ev: MessageEvent<{ id: string; msg: Request }>) {
      if (ev.source !== iframeRef.current?.contentWindow) return
      if (ev.data.msg == undefined) return
      callbacks[ev.data.id]?.(ev)
      delete callbacks[ev.data.id]
    }

    window.addEventListener("message", callback, true)
    ;(window as any).testPlugin = function (code: string[]) {
      useStore.setState({
        pluginLinks: code
      })
    }
    ;(window as any).testPluginScript = function (scripts: string[]) {
      ;(window as any).testPlugin(
        scripts.map(
          script =>
            "data:application/json;base64," +
            btoa(
              JSON.stringify({
                name: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
                type: "script",
                script: script
              })
            )
        )
      )
    }

    return () => {
      window.removeEventListener("message", callback)
    }
  }, [])

  const onLoadHandler = useCallback(() => {
    setReceiveHook(async (req: Request) => {
      const id = generateUUID()
      iframeRef.current!.contentWindow!.postMessage(
        {
          type: "message",
          msg: req,
          id
        },
        "*"
      )

      return await new Promise<Request>(res => {
        function callback(
          ev: MessageEvent<{
            msg: Request
          }>
        ) {
          console.log("parent received", ev.data.msg)
          res(ev.data.msg)
        }
        callbacksRef.current[id] = callback
      })
    })
    setSendHook(async (req: Request) => {
      const id = generateUUID()
      iframeRef.current!.contentWindow!.postMessage(
        {
          type: "send-message",
          msg: req,
          id
        },
        "*"
      )
      return await new Promise<Request>(res => {
        function callback(
          ev: MessageEvent<{
            msg: Request
          }>
        ) {
          res(ev.data.msg)
        }
        callbacksRef.current[id] = callback
      })
    })
    setAppHook(async (name: string) => {
      const id = generateUUID()
      iframeRef.current!.contentWindow!.postMessage(
        {
          type: "app",
          name,
          id
        },
        "*"
      )

      return await new Promise<{
        html: string
      } | null>(res => {
        function callback(
          ev: MessageEvent<{
            msg: {
              html: string
            } | null
          }>
        ) {
          res(ev.data.msg)
        }
        callbacksRef.current[id] = callback
      })
    })
  }, [])

  return (
    <>
      <iframe
        sandbox="allow-scripts"
        ref={iframeRef}
        src={createIframeSrc(complete ? codeQueries.map(query => (query.isSuccess ? query.data.content : "")) : [])}
        className="hidden"
        onLoad={onLoadHandler}
        {...{
          credentialless: "credentialless",
          csp
        }}
      />
      {children}
    </>
  )
}
