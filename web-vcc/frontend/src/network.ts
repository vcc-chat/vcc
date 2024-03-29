import { JSONRPCClient, JSONRPCServer, JSONRPCServerAndClient, TypedJSONRPCServerAndClient } from "json-rpc-2.0"
import { useEffect } from "preact/hooks"
import { useQueryClient } from "@tanstack/react-query"

import type { NewMessage } from "./config"
import useStore from "./store"
import { responseToChatList } from "./tools"
import { wait } from "./loaders"
import type { MethodType } from "./methodtype"
import { PermissionKey } from "./components/Settings"

type RPCType = TypedJSONRPCServerAndClient<
  {
    message: (msg: NewMessage) => void
  },
  MethodType
>

export async function useWebSocketConnection() {
  const backendAddress = useStore(state => state.backendAddress)
  const setReady = useStore(state => state.setReady)
  const changeLastMessageTime = useStore(state => state.changeLastMessageTime)
  const receiveHook = useStore(state => state.receiveHook)
  const addMessage = useStore(state => state.addMessage)
  const errorAlert = useStore(state => state.errorAlert)
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!backendAddress) return
    const ws = new WebSocket(backendAddress)
    ws.addEventListener("open", () => setReady(true))
    ws.addEventListener("error", () => setReady(false))
    const serverAndClient: RPCType = new JSONRPCServerAndClient(
      new JSONRPCServer(),
      new JSONRPCClient(async request => {
        if (ws.readyState == WebSocket.CLOSING || ws.readyState == WebSocket.CLOSED) return
        while (ws.readyState == WebSocket.CONNECTING) await wait()
        ws.send(JSON.stringify(request))
      })
    )
    ws.addEventListener("message", event => {
      serverAndClient.receiveAndSend(JSON.parse(event.data.toString()))
    })

    ws.addEventListener("close", event => {
      serverAndClient.rejectAllPendingRequests(`Connection is closed (${event.reason}).`)
      setReady(false)
      errorAlert("Oh No! The connection between server and client is interupted.")
    })
    serverAndClient.addMethod("message", async message => {
      changeLastMessageTime()
      if (message.payload == "") return
      const newMessage = {
        req: receiveHook ? await receiveHook(message) : message,
        time: +new Date()
      }
      const request = newMessage.req
      if (request == null) return
      addMessage(newMessage)
      // notify(chatNames[chatValues.indexOf(request.uid)], `${request.usrname}: ${request.msg}`)
      if (
        request.username == "system" &&
        (request.payload.includes("join") || request.payload.includes("quit") || request.payload.includes("kick"))
      ) {
        queryClient.invalidateQueries({
          queryKey: ["user-list", request.chat]
        })
      }
    })
    useStore.setState({
      makeRequestRaw(method, request) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return Promise.resolve(serverAndClient.request(method, request))
      }
    })
    return () => {
      ws.close()
      useStore.setState({
        makeRequestRaw: null
      })
    }
  }, [backendAddress])
}

async function makeRequest<K extends keyof MethodType>(method: K, request: Parameters<MethodType[K]>[0]) {
  return (await useStore.getState().makeRequest(method, request as any)) as unknown as ReturnType<MethodType[K]>
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
    async modifyUserPermission(
      chat: number,
      modifiedUser: number,
      name: PermissionKey,
      value: boolean
    ): Promise<boolean> {
      return await makeRequest("chat_modify_user_permission", {
        chat_id: chat,
        modified_user_id: modifiedUser,
        name,
        value
      })
    },
    async modifyPermission(chat: number, name: "public", value: boolean): Promise<boolean> {
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
    async checkInvite(token: string) {
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
      const data = await makeRequest("chat_list", {})
      return responseToChatList(data)
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
    async login(username: string, password: string) {
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
    },
    async getName(user: number) {
      return await makeRequest("login_get_name", { uid: user })
    },
    async getNickName(user: number) {
      return await makeRequest("login_get_nickname", { uid: user })
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
      return (
        await makeRequest("record_query", {
          chat,
          time: lastMessageTime
        })
      ).msg
    }
  },
  push: {
    async getVapidPublicKey() {
      return await makeRequest("push_get_vapid_public_key", {})
    },
    async register(subscription: PushSubscriptionJSON) {
      await makeRequest("push_register", {
        subscription
      })
    }
  },
  friend: {
    async sendRequest(user: number, reason: string | null) {
      return await makeRequest("friend_send_request", {
        friend_id: user,
        reason
      })
    },
    async listRequest() {
      return await makeRequest("friend_list_received_request", {})
    },
    async get() {
      return await makeRequest("friend_get_friends", {})
    },
    async acceptRequest(id: number) {
      return await makeRequest("friend_accept_request", { request_id: id })
    },
    async declineRequest(id: number) {
      return await makeRequest("friend_reject_request", { request_id: id })
    }
  },
  async send(chat: number, msg: string, session: string | null) {
    return await makeRequest("message", {
      chat,
      payload: msg,
      session,
      msg_type: "msg"
    })
  }
} as const

export default rpc
