import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useQueries } from "@tanstack/react-query"
import localforage from "localforage"

import { Request } from "./config"

async function getMetaInfo(urlString: string) {
  const response = await fetch(urlString)
  if (!response.ok) {
    throw new Error("Invalid url")
  }
  const { entry, name } = (await response.json()) as {
    entry: string
    name: string
  }
  const entryContent = await fetch(entry)
  if (!response.ok) {
    throw new Error("Invalid url")
  }
  return { content: await entryContent.text(), name }
}

const nonce = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)

const workerInitCode = `(${function () {
  const receiveHooks: ((message: Request) => (Request | null))[] = []
  const sendHooks: ((message: Request) => (Request | null))[] = []
  const commandHooks: Record<string, ((args: string[]) => Request | null)> = {}
  const commandRegex = /^command-(.*)$/
  self.addEventListener("message", function (ev: MessageEvent<{
    type: "message"
    msg: Request
    id: string
  } | {
    type: "send-message"
    msg: Request
    id: string
  } | {
    type: "command-${string}"
    arguments: string[]
    id: string
  }>) {
    const data = ev.data
    const { id } = data
    if (data.type == "message") {
      let msg = data.msg as Request | null
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
      let msg = data.msg as Request | null
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
    if (data.type.startsWith("command-")) {
      const command = /^command-(.*)$/.exec(data.type)![1]
      const args = data.arguments
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
  })

  self.URL.createObjectURL = () => { throw new Error("createObjectURL is not allowed") }

  function on(event: "receive" | "send" | `command-${string}`, func: (...args: any) => Request | null) {
    if (event == "receive") {
      receiveHooks.push(func)
    } else if (event == "send") {
      sendHooks.push(func)
    } else if (event.startsWith("command")) {
      const command = /^command-(.*)$/.exec(event)![1]
      commandHooks[command] = func
    } else {
      throw new Error("Invalid event")
    }
  }

  const toReadOnlySet = new WeakSet<any>()
  const readOnlyMap = new WeakMap<any, any>()
  const readOnlySet = new WeakSet<any>()

  const ObjectClone = Object
  const ProxyClone = Proxy
  const reflectApply = Reflect.apply

  function toReadOnly(obj: any) {
    if (toReadOnlySet.has(obj)) return
    if (Object.isFrozen(obj)) return
    toReadOnlySet.add(obj)
    const names = ObjectClone.getOwnPropertyNames(obj)
    if (names == undefined) {
      Object.freeze(obj)
      return
    }
    for (const i of names) {
      try {
        obj[i] = readOnly(obj[i])
      } catch (e) {}
    }
    Object.freeze(obj)
  }
  
  function readOnly(obj: any): any {
    if ((typeof obj != "object" && typeof obj != "function") || obj == null) return obj
    const cachedResult = readOnlyMap.get(obj)
    if (cachedResult != undefined) return cachedResult
    if (readOnlySet.has(obj)) return obj

    const proxy = new ProxyClone(function () {}, {
      apply(_, thisArg, argumentsList) {
        const result: any = reflectApply(obj, thisArg, argumentsList)
        if (typeof result == "object" || typeof result == "function") {
          toReadOnly(result.__proto__)
        }
        return result
      },
      construct(_, argumentsList, newTarget) {
        const result: any = Reflect.construct(obj, argumentsList, newTarget)
        if (typeof result == "object" || typeof result == "function") {
          toReadOnly(result.__proto__)
        }
        return result
      },
      defineProperty() { return false },
      deleteProperty() { return false },
      get(_, key) {
        return readOnly(obj[key])
      },
      getOwnPropertyDescriptor(_, key) {
        return readOnly(Reflect.getOwnPropertyDescriptor(obj, key))
      },
      getPrototypeOf(_) {
        return readOnly(Reflect.getPrototypeOf(obj))
      },
      has(_, key) {
        return Reflect.has(obj, key)
      },
      isExtensible(_) { return false },
      ownKeys(_) { return Reflect.ownKeys(obj) },
      preventExtensions() { return true },
      set() { return false },
      setPrototypeOf() { return false }
    })
    readOnlySet.add(proxy)
    readOnlyMap.set(obj, proxy)
    return proxy
  }

  (self as any).readOnly = readOnly
  ;(self as any).toReadOnly = toReadOnly

  ;(self as any).createGlobal = function () {
    const proxy: any = new Proxy({
      on: readOnly(on)
    } as any, {
      get(target, key) {
        if (key == Symbol.unscopables) {
          return undefined
        }
        return target[key] ?? readOnly(self[key as any])
      },
      has() {
        return true
      }
    })
    return proxy
  }

  for (let i of [Number, String, Function, Object, RegExp, Promise, Array, Symbol, BigInt]) {
    toReadOnly(i as any)
    toReadOnly((i as any).prototype)
  }
}})();`

function generateUUID() {
  if (location.protocol == "https:") return crypto.randomUUID()
  return URL.createObjectURL(new Blob).slice(-36)
}

function createIframeSrc(originalScripts: string[]) {
  let scripts: string = workerInitCode
  for (const originalScript of originalScripts) {
    try {
      new Function(originalScript)
      scripts += `
        ;(function () {
          var global = self.createGlobal()
          ;(function () {
            with (global) {
              ${originalScript}
            }
          }).call(global)
        })();
      `
    } catch (e) {
      // Plugin won't be load if there's syntax error
      console.error(new SyntaxError("The plugin is broken, it will not be load"))
    }
  }
  return "data:text/html;charset=utf-8," + encodeURIComponent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; worker-src blob:; script-src 'nonce-${nonce}';">
        <script nonce="${nonce}">
          (function () {
            var script = ${JSON.stringify(scripts)}
            var url = URL.createObjectURL(new Blob([script]), {
              type: "application/javascript"
            })
            var worker = new Worker(url)
            worker.onmessage = function (ev) {
              console.log("from worker", ev.data)
              parent.postMessage(ev.data, "*")
            }
            window.onmessage = function (ev) {
              console.log("from parent", ev.data)
              worker.postMessage(ev.data)
            }
          })()
        </script>
      </head>
      <body></body>
    </html>
  `)
}

const PluginContext = createContext<{
  receiveHook: null | ((message: Request) => Promise<Request>),
  sendHook: null | ((message: Request) => Promise<Request>),
  plugins: string[],
  setPlugins: ((value: string[]) => void) | null
}>({
  receiveHook: null,
  sendHook: null,
  plugins: [],
  setPlugins: null
})

export function PluginProvider({ children }: {
  children: ReactNode
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const callbacksRef = useRef<Record<string, ((ev: MessageEvent<{ msg: Request }>) => void)>>({})

  const [receiveHook, setReceiveHook] = useState<null | ((message: Request) => Promise<Request>)>(null)
  const [sendHook, setSendHook] = useState<null | ((message: Request) => Promise<Request>)>(null)
  const [urls, setUrls] = useState<string[]>([])

  const codeQueries = useQueries({
    queries: urls.map(url => ({
      queryKey: ["plugin-code", url],
      queryFn: () => {
        return getMetaInfo(url)
      }
    }))
  })

  const complete = useMemo(() => (
    codeQueries.reduce((a, b) => a && (b.isError || b.isSuccess), true)
  ), [codeQueries])


  useEffect(() => {
    const callbacks = callbacksRef.current
    function callback(ev: MessageEvent<{ id: string, msg: Request }>) {
      if (ev.data.msg == undefined) return
      if (callbacks[ev.data.id] == undefined) return
      callbacks[ev.data.id](ev)
      delete callbacks[ev.data.id]
    }

    window.addEventListener("message", callback, true)

    localforage
      .getItem("plugin")
      .then(data => {
        if (data != undefined) {
          setUrls(data as string[])
        }
      })

    ;(window as any).testPlugin = function (code: string[]) {
      setUrls(code)
    }

    ;(window as any).sendHook = null

    return () => {
      window.removeEventListener("message", callback)
    }
  }, [])

  const onLoadHandler = useCallback(() => {
    setReceiveHook(() => async (req: Request) => {
      const id = generateUUID()
      iframeRef.current!.contentWindow!.postMessage({
        type: "message",
        msg: req,
        id
      }, "*")

      return await new Promise<Request>(res => {
        function callback(ev: MessageEvent<{
          msg: Request
        }>) {
          console.log("parent received", ev.data.msg)
          res(ev.data.msg)
        }
        callbacksRef.current[id] = callback
      })
    })
    async function sendHook(req: Request) {
      const id = generateUUID()
      iframeRef.current!.contentWindow!.postMessage({
        type: "send-message",
        msg: req,
        id
      }, "*")
      return await new Promise<Request>(res => {
        function callback(ev: MessageEvent<{
          msg: Request
        }>) {
          res(ev.data.msg)
        }
        callbacksRef.current[id] = callback
      })
    }
    setSendHook(() => sendHook)
    ;(window as any).sendHook = sendHook
  }, [])

  return (
    <>
      <iframe sandbox="allow-scripts" ref={iframeRef} src={createIframeSrc(complete ? codeQueries.map(
        query => (query.isSuccess ? query.data.content : "")
      ) : [])} className="hidden" onLoad={onLoadHandler} {...{
        credentialless: "credentialless"
      }} />
      <PluginContext.Provider value={{
        receiveHook,
        sendHook,
        plugins: urls,
        setPlugins: setUrls
      }}>
        {children}
      </PluginContext.Provider>
    </>
  )
}

export function usePlugin() {
  return useContext(PluginContext)
}