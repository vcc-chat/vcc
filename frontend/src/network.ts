import { JSONRPCClient, JSONRPCServer, JSONRPCServerAndClient } from "json-rpc-2.0"
import { useEffect } from "preact/hooks"
import { useQueryClient } from "@tanstack/react-query"

import type { RequestType, Request, RequestWithTime } from "./config"
import useStore from "./store"
import { responseToChatList } from "./tools"

export async function useWebSocketConnection() {
  const backendAddress = useStore(state => state.backendAddress)
  const setSendJsonMessageRaw = useStore(state => state.setSendJsonMessageRaw)
  const setReady = useStore(state => state.setReady)
  const changeLastMessageTime = useStore(state => state.changeLastMessageTime)
  const receiveHook = useStore(state => state.receiveHook)
  const addMessage = useStore(state => state.addMessage)
  const errorAlert = useStore(state => state.errorAlert)
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!backendAddress) return
    const webSocket = new WebSocket(backendAddress)
    webSocket.addEventListener("open", () => setReady(true))
    webSocket.addEventListener("error", () => setReady(false))
    const serverAndClient = new JSONRPCServerAndClient(
      new JSONRPCServer(),
      new JSONRPCClient(async request => {
        webSocket.send(JSON.stringify(request))
      })
    )
    webSocket.addEventListener("message", event => {
      serverAndClient.receiveAndSend(JSON.parse(event.data.toString()))
    })

    webSocket.addEventListener("close", event => {
      serverAndClient.rejectAllPendingRequests(`Connection is closed (${event.reason}).`)
      setReady(false)
      errorAlert("Oh No! The connection between server and client is interupted.")
    })
    serverAndClient.addMethod("message", async (message: Request) => {
      changeLastMessageTime()
      if (message.msg == "") return
      const newMessage = {
        req: receiveHook ? await receiveHook(message) : message,
        time: +new Date()
      }
      const request = newMessage.req
      if (request == null) return
      addMessage(newMessage)
      // notify(chatNames[chatValues.indexOf(request.uid)], `${request.usrname}: ${request.msg}`)
      if (
        request.usrname == "system" &&
        (request.msg.includes("join") || request.msg.includes("quit") || request.msg.includes("kick"))
      ) {
        queryClient.invalidateQueries({
          queryKey: ["user-list", request.uid]
        })
      }
    })
    setSendJsonMessageRaw(request => {
      const { type, ...other } = request
      if (request.type == "message") {
        serverAndClient.notify(type, other)
      } else {
        serverAndClient.request(type, other).then(result => {
          useStore.getState().handleFunctionList[request.uuid!](result)
        })
      }
    })
  }, [backendAddress])
}

async function makeRequest(method: RequestType, request: Record<string, any> = {}): Promise<any> {
  return await useStore.getState().makeRequest(Object.assign({ type: method }, request) as any)
}

const rpc = {
  chat: {
    async quit(chat: number): Promise<boolean> {
      return await makeRequest("chat_quit", {
        chat
      })
    },
    async kick(chat: number, user: number): Promise<boolean> {
      return await makeRequest("chat_kick", {
        chat,
        user
      })
    },
    async rename(chat: number, name: string): Promise<boolean> {
      return await makeRequest("chat_rename", {
        chat,
        name
      })
    },
    async modifyUserPermission(chat: number, modifiedUser: number, name: string, value: boolean): Promise<boolean> {
      return await makeRequest("chat_modify_user_permission", {
        chat_id: chat,
        modified_user_id: modifiedUser,
        name,
        value
      })
    },
    async modifyPermission(chat: number, name: string, value: boolean): Promise<boolean> {
      return await makeRequest("chat_modify_permission", {
        chat,
        name,
        value
      })
    },
    async join(chat: number): Promise<boolean> {
      return await makeRequest("chat_join", {
        chat
      })
    },
    async getUsers(chat: number): Promise<[number, string][]> {
      return await makeRequest("chat_get_users", {
        chat
      })
    },
    async getAllPermission(chat: number): Promise<Record<number, Record<string, boolean>>> {
      return await makeRequest("chat_get_all_permission", {
        chat
      })
    },
    async getPermission(chat: number): Promise<Record<string, boolean>> {
      return await makeRequest("chat_get_permission", {
        chat
      })
    },
    async changeNickname(chat: number, user: number, name: string): Promise<boolean> {
      return await makeRequest("chat_change_nickname", {
        chat,
        user,
        name
      })
    },
    async create(name: string, parent: number | null = null): Promise<number> {
      return await makeRequest("chat_create", {
        name,
        parent
      })
    },
    async invite(token: string): Promise<boolean> {
      return await makeRequest("chat_invite", {
        token
      })
    },
    async checkInvite(token: string): Promise<
      | {
          inviter: number
          chat: number
        }
      | {
          inviter: null
          chat: null
        }
    > {
      return await makeRequest("chat_check_invite", {
        token
      })
    },
    async getInviteLink(chat: number) {
      return `/chats/invite/?token=${await makeRequest("chat_generate_invite", {
        chat
      })}`
    },
    async list() {
      const data: [number, string, number | null][] = await makeRequest("chat_list", {})
      const { values, names, parentChats } = responseToChatList(data)
      return {
        values,
        names,
        parentChats
      }
    },
    async getNickname(chat: number, user: number) {
      return await makeRequest("chat_get_nickname", {
        user,
        chat
      })
    }
  },
  session: {
    async join(name: string, parent: number) {
      return await makeRequest("session_join", {
        parent,
        name
      })
    }
  },
  user: {
    async login(
      username: string,
      password: string
    ): Promise<{ success: true; token: string } | { success: false; token: null }> {
      return await makeRequest("login", {
        username,
        password
      })
    },
    async register(username: string, password: string): Promise<boolean> {
      return await makeRequest("register", {
        username,
        password
      })
    },
    async isOnline(users: number[]): Promise<boolean[]> {
      return await makeRequest("is_online", {
        users
      })
    },
    async tokenLogin(token: string) {
      return await makeRequest("token_login", {
        token
      })
    }
  },
  oauth: {
    async request() {
      const { request_id: requestID, url } = await makeRequest("request_oauth", {
        platform: "github"
      })
      return { requestID, url }
    },
    async login(requestID: string) {
      return await makeRequest("login_oauth", {
        platform: "github",
        request_id: requestID
      })
    }
  },
  file: {
    async upload(file: File): Promise<{
      ok: boolean
      id: string
      url: string
    }> {
      const { id, url } = await makeRequest("file_upload", {
        name: file.name
      })
      const { ok } = await fetch(url, {
        method: "PUT",
        body: file
      })
      return {
        ok,
        id,
        url
      }
    },
    async download(id: string) {
      return await makeRequest("file_download", { id })
    }
  },
  record: {
    async query(chat: number, lastMessageTime: number) {
      return []
      const { msg } = await makeRequest("record_query", {
        uid: chat,
        msg: lastMessageTime as any
      })
      return (msg as unknown as string[]).map<RequestWithTime>((dataString, index) => {
        const data = JSON.parse(dataString)
        return {
          req: {
            msg: data.msg,
            usrname: data.username,
            uid: data.chat,
            type: "message"
          },
          // need to be changed
          time: Date.now() + index
        }
      })
    }
  },
  push: {
    async getVapidPublicKey() {
      return await makeRequest("push_get_vapid_public_key")
    },
    async register(subscription: PushSubscriptionJSON) {
      await makeRequest("push_register", {
        subscription
      })
    }
  }
} as const

export default rpc
