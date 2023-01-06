type Response<T = unknown> = {
  type: string
  id: string
} & ({
  ok: true
  response: T
} | {
  ok: false
  error: string
})

type Request = {
  type: string
  id: string
  request: unknown
}

export class VCCError extends Error {}

type Any = ReturnType<JSON["parse"]>

class WebSocketWrapper {
  websocket: WebSocket
  IDFuncMap: Record<string, (response: Response<Any>) => void>
  constructor(url: string | URL) {
    this.websocket = new WebSocket(url)
    this.IDFuncMap = {}
  }
  async waitOpen() {
    await new Promise<void>(res => {
      this.websocket.addEventListener("open", () => {
        res()
      })
    })
  }
  createRecvLoop() {
    this.websocket.addEventListener("message", (msg) => {
      const data = msg.data
      const response: Response = JSON.parse(data)
      this.IDFuncMap[response.id]?.(response)
      delete this.IDFuncMap[response.id]
    })
  }
  sendNoResponse(type: string, requestData: unknown) {
    const id = crypto.randomUUID()
    const request: Request = {
      type,
      id,
      request: requestData
    }
    this.websocket.send(JSON.stringify(request))
    return id
  }
  async send<T = unknown>(type: string, requestData: unknown) {
    const id = this.sendNoResponse(type, requestData)
    const response = await new Promise<Response<T>>(res => {
      this.IDFuncMap[id] = res
    })
    if (response.ok) {
      return response.response
    } else {
      throw new VCCError(response.error)
    }
  }
}

function createRPC(wrapper: WebSocketWrapper, prefix = "") {
  return new Proxy({} as Record<string, <T = unknown>(req: unknown) => Promise<T>>, {
    get(_, type) {
      if (typeof type == "symbol") throw new VCCError("Using symbol type is not allowed")
      return async (data: unknown) => {
        return await wrapper.send(prefix + type, data)
      }
    },
    has: (_, name) => typeof name == "string"
  })
}

export class ConnectionChatOperations {
  private rpc: Record<string, <T>(req: unknown) => Promise<T>>
  constructor(websocket: WebSocketWrapper) {
    this.rpc = createRPC(websocket, "chat_")
  }

  async create(name: string, parent_chat_id = -1) {
    return await this.rpc.create({
      name,
      parent_chat_id
    })
  }
  
  async join(id: number) {
    await this.rpc.join({ id })
  }

  async getUsers(id: number) {
    return await this.rpc.get_users<number[]>({ id })
  }

  async quit(id: number) {
    await this.rpc.join({ id })
  }

  async list() {
    return await this.rpc.list<[number, string, number | null][]>({})
  }

  async kick(chat_id: number, kicked_user_id: number) {
    await this.rpc.kick({
      chat_id, kicked_user_id
    })
  }

  async rename(chat_id: number, new_name: string) {
    await this.rpc.rename({
      chat_id, new_name
    })
  }

  async modifyUserPermission(chat_id: number, modified_user_id: number, name: string, value: boolean) {
    await this.rpc.modify_user_permission({
      chat_id, modified_user_id, name, value
    })
  }

  async modifyPermission(chat_id: number, name: string, value: boolean) {
    await this.rpc.modify_permission({
      chat_id, name, value
    })
  }

  async getAllPermission(chat_id: number) {
    await this.rpc.get_all_permission({
      chat_id
    })
  }

  async getPermission(chat_id: number) {
    await this.rpc.get_permission({
      chat_id
    })
  }
}

export class Connection {
  private rpc: Record<string, <T>(req: unknown) => Promise<T>>
  private websocket: WebSocketWrapper
  chat: ConnectionChatOperations

  private constructor(url: string | URL) {
    this.rpc = {}
    this.chat = undefined as unknown as ConnectionChatOperations
    this.websocket = new WebSocketWrapper(url)
  }

  private static async create(url: string | URL) {
    try {
      const connection = new Connection(url)
      const websocket = connection.websocket
      await websocket.waitOpen()
      websocket.createRecvLoop()
      connection.rpc = createRPC(websocket)
      connection.chat = new ConnectionChatOperations(websocket)
      return connection
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  sendMessage(msg: string, chat: number, session: string | null = null) {
    this.websocket.sendNoResponse("message", { msg, chat, session })
  }

  async login(username: string, password: string) {
    await this.rpc.login({
      username, password
    })
  }

  async register(username: string, password: string) {
    await this.rpc.register({
      username, password
    })
  }
}

export function createConnection(url: string | URL = "ws://127.0.0.1:2470") {
  return (Connection as unknown as { create: (url: string | URL) => Promise<Connection> }).create(url)
}