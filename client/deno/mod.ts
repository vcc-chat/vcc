import { readLines } from "https://deno.land/std@0.171.0/io/read_lines.ts"

type Response = {
  type: string
  id: string
} & ({
  ok: true
  response: unknown
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

function createRPC(conn: Deno.TcpConn, IDFuncMap: Record<string, (response: Response) => void>, prefix = "") {
  const encoder = new TextEncoder()
  return new Proxy({} as Record<string, <T = unknown>(req: unknown) => Promise<T>>, {
    get(_, type) {
      if (typeof type == "symbol") throw TypeError()
      return async (requestData: unknown) => {
        const id = crypto.randomUUID()
        const request: Request = {
          type: prefix + type,
          id,
          request: requestData
        }
        await conn.write(encoder.encode(JSON.stringify(request) + "\r\n"))
        const response = await new Promise<Response>(res => {
          IDFuncMap[id] = res
        })
        if (response.ok) {
          return response.response
        } else {
          throw new VCCError(response.error)
        }
      }

    },
    has(_, key) {
      if (typeof key == "symbol") return false
      return true
    }
  })
}

export class ConnectionChatOperations {
  private rpc: Record<string, <T>(req: unknown) => Promise<T>>
  constructor(conn: Deno.TcpConn, IDFuncMap: Record<string, (response: Response) => void>) {
    this.rpc = createRPC(conn, IDFuncMap, "chat_")
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
  private conn: Deno.TcpConn
  private IDFuncMap: Record<string, (response: Response) => void>
  private encoder: TextEncoder
  private rpc: Record<string, <T>(req: unknown) => Promise<T>>
  chat: ConnectionChatOperations

  private constructor() {
    this.conn = undefined as unknown as Deno.TcpConn
    this.IDFuncMap = {}
    this.encoder = new TextEncoder()
    this.rpc = {}
    this.chat = undefined as unknown as ConnectionChatOperations
  }

  private static async create() {
    const conn = await Deno.connect({
      port: 2470
    })
    const connection = new Connection()
    connection.conn = conn
    ;(async () => {
      for await (const line of readLines(conn)) {
        console.log(line)
        const response: Response = JSON.parse(line)
        connection.IDFuncMap[response.id]?.(response)
        delete connection.IDFuncMap[response.id]
      }
    })()
    connection.rpc = createRPC(conn, connection.IDFuncMap)
    connection.chat = new ConnectionChatOperations(conn, connection.IDFuncMap)
    return connection
  }

  private async sendNonblock(request: Request) {
    await this.conn.write(this.encoder.encode(JSON.stringify(request) + "\r\n"))
  }

  async sendMessage(msg: string, chat: number, session: string | null = null) {
    await this.sendNonblock({
      type: "message",
      id: crypto.randomUUID(),
      request: { msg, chat, session }
    })
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

export function createConnection() {
  return (Connection as unknown as { create: () => Promise<Connection> }).create()
}