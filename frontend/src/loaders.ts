import {
  redirect,
  json,
  LoaderFunctionArgs,
  useActionData,
  ActionFunctionArgs,
  useLoaderData
} from "react-router-dom"

import store from "./store"
import { LoginType } from "./state/login"
import { queryClient } from "./tools"
import { PermissionKey, allPermissions } from "./Settings"

import shellQuote from "shell-quote"

export function wait() {
  return new Promise<void>(res => setTimeout(res, 0))
}

async function authLoader(jumpToLogin: boolean = true) {
  const { makeRequest } = store.getState()
  const loginStatus = store.getState().type
  if (loginStatus == LoginType.LOGIN_SUCCESS) {
    return new Response()
  }
  if (loginStatus == LoginType.NOT_LOGIN) {
    if (jumpToLogin) {
      return redirect("/login")
    }
    return new Response()
  }
  const token = store.getState().token
  if (typeof token == "string") {
    const req = await makeRequest({
      type: "token_login",
      uid: 0,
      usrname: "",
      msg: token
    })
    if (req.uid != null) {
      store.setState({
        username: req.usrname
      })
      store.getState().success()
    } else {
      store.getState().reset()
      store.getState().setToken(null)
      if (jumpToLogin) {
        return redirect("/login")
      }
    }
  } else {
    store.getState().reset()
    if (jumpToLogin) {
      return redirect("/login")
    }
  }
  return new Response()
}

export function homeLoader() {
  return redirect("/chats/empty")
}

function badRequest() {
  return new Response("Bad Request", { status: 400 })
}

export async function inviteLoader({ request }: LoaderFunctionArgs) {
  const { makeRequest } = store.getState()
  const authResult = await authLoader()
  if (authResult.status != 200) return authResult

  const url = new URL(request.url)
  const token = url.searchParams.get("token")
  if (token == null) {
    return redirect("/")
  }
  const chat = (await makeRequest({
    type: "chat_invite",
    uid: 0,
    usrname: "",
    msg: token
  })).msg
  if (chat == null) {
    throw badRequest()
  }
  return json({ chat, token })
}

export async function chatLoader() {
  return authLoader()
}


function parseCommand(msg: string) {
  if (!msg.length || msg[0] !== "/") {
    return { type: "message" } as const
  }
  const parsedResult = shellQuote.parse(msg.slice(1)).filter(value => typeof value == "string") as unknown as string[]
  const type = parsedResult?.[0]?.toLowerCase?.()
  const error = { type: "error" } as const
  if (!type) return error
  switch (type) {
    case "ban":
    case "unban":
      if (parsedResult.length == 2) {
        return {
          type: "perm-set" as const,
          user: parsedResult[1],
          name: "banned" as PermissionKey,
          value: type == "ban"
        }
      }
      return error
    case "op":
    case "deop":
      if (parsedResult.length == 2) {
        return {
          type: "perm-set" as const,
          user: parsedResult[1],
          name: "modify_permission" as PermissionKey,
          value: type == "op"
        }
      }
      return error
    case "kick":
      if (parsedResult.length == 2) {
        return {
          type: "kick" as const,
          user: parsedResult[1]
        }
      }
      return error
    case "perm":
      if (parsedResult.length >= 3 && allPermissions.includes(parsedResult[3] as unknown as PermissionKey)) {
        // if (parsedResult[1] == "get" && parsedResult.length == 4) {
        //   return {
        //     type: "perm-get" as const,
        //     user: parsedResult[2],
        //     name: parsedResult[3] as unknown as PermissionKey
        //   }
        // } else 
        if (parsedResult[1] == "set") {
          const valueRaw = parsedResult[4].toLowerCase()
          const valueNumber = parseInt(valueRaw, 10)
          const value = valueRaw == "on" || valueRaw == "true" || !!valueNumber
          return {
            type: "perm-set" as const,
            user: parsedResult[2],
            name: parsedResult[3] as unknown as PermissionKey,
            value
          }
        }
      }
      return error
    default:
      return error
  }

}

export async function chatAction({ params, request }: ActionFunctionArgs) {
  const { makeRequest, sendJsonMessage } = store.getState()
  const { id: chatString } = params
  const { msg, session } = Object.fromEntries(await request.formData())
  console.log({ chatString, msg, session })
  if (chatString == null || msg == null || typeof msg != "string") {
    throw badRequest()
  }
  if (msg == "") return { ok: true }
  const chat = parseInt(chatString)
  if (Number.isNaN(chat)) {
    throw badRequest()
  }
  const parsedResult = parseCommand(msg)
  async function getUserID(username: string) {
    const data = await queryClient.fetchQuery({
      queryKey: ["user-list", chat],
      queryFn: async () => {
        const { msg } = await makeRequest({
          type: "chat_get_users",
          uid: chat
        })
        return msg as unknown as [number, string][]
      }
    })
    return data.find(([id, name]) => name == username)?.[0]
  }
  console.log(parsedResult)
  if (parsedResult.type == "message" || parsedResult.type == "error") {
    const rawRequest = {
      uid: chat,
      type: "message" as const,
      usrname: store.getState().username,
      msg: msg,
      session: (session || null) as unknown as string
    }
    const sendHook = store.getState().sendHook
    if (sendHook) {
      const newRequest = await sendHook(rawRequest)
      if (newRequest != null) {
        await sendJsonMessage(newRequest)
      }
    } else {
      await sendJsonMessage(rawRequest)
    }
    return { ok: true }
  } else if (parsedResult.type == "kick") {
    const uid = await getUserID(parsedResult.user)
    if (uid == undefined) return { ok: false }
    const { uid: success } = await makeRequest({
      type: "chat_kick",
      uid: chat,
      msg: uid as any
    })
    if (success) {
      queryClient.invalidateQueries({ queryKey: ["user-list", chat] })
    }
    return { ok: !!success }
  } else if (parsedResult.type == "perm-set") {
    const uid = await getUserID(parsedResult.user)
    if (uid == undefined) return { ok: false }
    const { uid: success } = await makeRequest({
      type: "chat_modify_user_permission",
      msg: {
        "chat_id": chat,
        "modified_user_id": uid,
        "name": parsedResult.name,
        "value": parsedResult.value
      } as any
    })
    return { ok: !!success }
  } else {
    const _: never = parsedResult
  }
  return { ok: false }
}

export function useChatActionData() {
  return useActionData() as {
    ok: boolean
  } | undefined
}

export async function settingsIndexLoader({ params }: LoaderFunctionArgs) {
  const { id } = params
  return redirect(`/chats/${id}/settings/null`)
}

export async function settingsLoader() {
  return await authLoader()
}

export async function settingsInfoLoader({ params }: LoaderFunctionArgs) {
  const { makeRequest } = store.getState()
  const authResult = await authLoader()
  if (authResult.status != 200) return authResult

  const { id: chatString } = params
  if (chatString === undefined) throw badRequest()

  const chat = parseInt(chatString, 10)
  if (Number.isNaN(chat)) throw badRequest()

  const inviteLink = await queryClient.fetchQuery({
    queryKey: ["get-invite-link", chat],
    queryFn: async () => {
      const { msg } = await makeRequest({
        type: "chat_generate_invite",
        uid: chat,
        usrname: "",
        msg: ""
      })
      return `/chats/invite/?token=${msg}`
    }
  })
  return json({ inviteLink })
}

export async function settingsActionsLoader({ params }: LoaderFunctionArgs) {
  const { makeRequest } = store.getState()
  const authResult = await authLoader()
  if (authResult.status != 200) return authResult

  const { id: chatString } = params
  if (chatString === undefined) throw badRequest()

  const chat = parseInt(chatString, 10)
  if (Number.isNaN(chat)) throw badRequest()

  const a = await queryClient.fetchQuery({
    queryKey: ["chat-public", chat],
    queryFn: async () => {
      const { msg } = await makeRequest({
        type: "chat_get_permission",
        uid: chat,
        usrname: "",
        msg: ""
      })
      return msg as unknown as Record<string, boolean>
    }
  })
  return json({ public_: a.public })
}

export function useSettingsActionsLoaderData() {
  return useLoaderData() as {
    public_: boolean
  }
}

export function useSettingsUsersLoaderData() {
  return useLoaderData() as {
    users: [number, string][]
    permission: Record<number, Record<string, boolean>>
  }
}

export function useSettingsInfoLoaderData() {
  return useLoaderData() as {
    inviteLink: string
  }
}

export async function loginLoader() {
  return await authLoader(false)
}

export async function loginAction({ request }: ActionFunctionArgs) {
  const { makeRequest } = store.getState()
  const { username, password } = Object.fromEntries(await request.formData())
  if (typeof username != "string" || typeof password != "string") {
    throw badRequest()
  }
  const { uid, msg } = await makeRequest({
    uid: 0,
    type: "login",
    usrname: username,
    msg: password
  })
  if (uid) {
    return {
      success: true,
      token: msg
    }
  } else {
    return {
      success: false,
      token: null
    }
  }
}

export function useLoginActionData() {
  return useActionData() as {
    success: true,
    token: string
  } | {
    success: false,
    token: null
  } | undefined
}

export async function registerLoader() {
  return await authLoader(false)
}

export async function registerAction({ request }: ActionFunctionArgs) {
  const { makeRequest } = store.getState()
  const { username, password } = Object.fromEntries(await request.formData())
  if (typeof username != "string" || typeof password != "string") {
    throw badRequest()
  }
  const { uid } = await makeRequest({
    uid: 0,
    type: "register",
    usrname: username,
    msg: password
  })
  return {
    success: !!uid
  }
}

export function useRegisterActionData() {
  return useActionData() as {
    success: boolean
  } | undefined
}

export function createChatLoader() {
  return authLoader()
}

export function fileDownloadLoader() {
  return authLoader()
}

export function appLoader() {
  return authLoader()
}

export function chooseBackendLoader({ request: { url } }: LoaderFunctionArgs) {
  const path = new URL(url).pathname
  const { backendAddress } = store.getState()
  if (!backendAddress && path != "/choose-backend") {
    return redirect("/choose-backend")
  }
  // console.log(request)
  return new Response()
}