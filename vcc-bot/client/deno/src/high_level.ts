import { createRawConnection, RawConnection, UserPermissions, ChatPermissions } from "./low_level.ts"

export class User {
  readonly id: number
  readonly name: string
  constructor(id: number, name: string) {
    this.id = id
    this.name = name
    return Object.freeze(this)
  }
}

export class Chat {
  readonly id: number
  name: string
  joined = true
  private builder: Builder
  constructor(id: number, name: string, builder: Builder) {
    this.id = id
    this.name = name
    this.builder = builder
  }
  async quit() {
    await this.builder._conn.chat.quit(this.id)
    this.joined = false
    this.builder.chats.chats.delete(this)
  }
  async getUsers() {
    return (
      (await this.builder._conn.chat.getUsers(this.id))
        .map(([id, name]) => new User(id, name))
    )
  }
  async kick(user: User) {
    await this.builder._conn.chat.kick(this.id, user.id)
  }
  async rename(name: string) {
    if (this.name == name) return
    await this.builder._conn.chat.rename(this.id, name)
  }
  async modifyUserPermission(user: User, name: UserPermissions, value: boolean) {
    await this.builder._conn.chat.modifyUserPermission(this.id, user.id, name, value)
  }
  async modifyPermission(name: ChatPermissions, value: boolean) {
    await this.builder._conn.chat.modifyPermission(this.id, name, value)
  }
  async getPermission() {
    return await this.builder._conn.chat.getPermission(this.id)
  }
  async getUserPermission(user: User) {
    return await this.builder._conn.chat.getUserPermission(this.id, user.id)
  }
  sendMessage(username: string, msg: string, session: string | null = null) {
    this.builder._conn.sendMessage(username, msg, this.id, session)
  }
}

export class ChatList {
  chats = new Set<Chat>()
  private builder: Builder
  private constructor(builder: Builder) {
    this.builder = builder
  }
  getChatByID(chatID: number) {
    return [...this.chats].find(({ id }) => id == chatID)
  }
  getChatByName(chatName: string) {
    return [...this.chats].filter(({ name }) => name == chatName)
  }
  async join(id: number) {
    await this.builder._conn.chat.join(id)
    await this.builder.updateChats()
    return this.getChatByID(id)!
  }
}

export class Builder {
  _conn = undefined as unknown as RawConnection
  chats: ChatList
  private constructor() {
    this.chats = new (ChatList as unknown as {
      new(builder: Builder): ChatList
    })(this)
  }
  private updateChatsFromValues(chats: [number, string, number | null][]) {
    // Newly joined
    const chatsArray = [...this.chats.chats]
    const chatsNew = chats
      .filter(([id]) => chatsArray.find(chat => chat.id == id) == undefined)
    for (const [id, name] of chatsNew) {
      this.chats.chats.add(new Chat(id, name, this))
    }
    for (const chat of this.chats.chats) {
      const name = chats.find(([id]) => id == chat.id)?.[1]
      if (name == undefined) {
        // Kicked, banned or quit
        chat.joined = false
        this.chats.chats.delete(chat)
        continue
      }
      // Not changed (but maybe renamed)
      chat.name = name
    }
  }
  async updateChats() {
    this.updateChatsFromValues(await this._conn.chat.list())
  }
  
  get onMessage() {
    return this._conn.onMessage
  }

  set onMessage(onMessage) {
    this._conn.onMessage = onMessage
  }
}

function sleep(milliseconds: number) {
  return new Promise<void>(res => {
    setTimeout(res, milliseconds)
  })
}

export async function createBuilder(config: {
  url?: string | URL,
  username: string,
  password: string,
  authType?: "login" | "register",
  chatRefreshTime?: number
}) {
  const { url = undefined, authType = "login", username, password, chatRefreshTime = 10000 } = config
  const builder = new (Builder as unknown as {
    new(): Builder
  })
  const conn = await createRawConnection(url)
  builder._conn = conn
  if (authType == "login") {
    await conn.login(username, password)
  } else {
    await conn.register(username, password)
  }
  await builder.updateChats()
  ;(async () => {
    await sleep(chatRefreshTime)
    await builder.updateChats()
  })()
  return builder
}
