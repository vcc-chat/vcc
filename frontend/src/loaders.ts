import {
  redirect,
  json,
  type LoaderFunctionArgs,
  useActionData,
  type ActionFunctionArgs,
  useLoaderData
} from "react-router-dom"

import store, { clearData } from "./store"
import { LoginType } from "./state/login"
import { queryClient, syncMessages } from "./tools"
import { PermissionKey, allPermissions } from "./components/Settings"

import shellQuote from "shell-quote"
import { initBackend } from "./components/ChooseBackend"
import rpc from "./network"

export function wait() {
  return new Promise<void>(res => setTimeout(res, 0))
}

async function authLoader(jumpToLogin = true) {
  const loginStatus = store.getState().type
  if (loginStatus == LoginType.LOGIN_SUCCESS) {
    return new Response()
  }
  if (loginStatus == LoginType.NOT_LOGIN) {
    if (jumpToLogin) {
      throw redirect("/login")
    }
    return new Response()
  }
  const token = store.getState().token
  if (token != null) {
    const { success, username } = await rpc.user.tokenLogin(token)
    if (success) {
      store.setState({
        username
      })
      store.getState().success()
    } else {
      store.getState().reset()
      store.getState().setToken(null)
      if (jumpToLogin) {
        throw redirect("/login")
      }
    }
  } else {
    store.getState().reset()
    if (jumpToLogin) {
      throw redirect("/login")
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
  await authLoader()

  const url = new URL(request.url)
  const token = url.searchParams.get("token")
  if (token == null) {
    return redirect("/")
  }
  const { chat } = await rpc.chat.checkInvite(token)
  if (chat == null) {
    throw badRequest()
  }
  return json({ chat, token })
}

export async function chatLoader({ params }: LoaderFunctionArgs) {
  await authLoader()
  const { id } = params
  const { values: chats, names: chatNames } = (queryClient.getQueryData(["chat-list"]) ?? {
    values: [],
    names: []
  }) as {
    values: number[]
    names: string[]
  }
  const chatRaw = Number(id)
  const chat = Number.isNaN(chatRaw) || !chats.includes(chatRaw) ? null : chatRaw
  const { changeChat, changeChatName } = store.getState()

  changeChat(chat)
  changeChatName(chat == null ? "" : chatNames[chats.indexOf(chat)])

  if (chat == null && chats.length) {
    return redirect(`/chats/${chats[0]}`)
  }

  syncMessages()

  return new Response()
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
  const { sendJsonMessage } = store.getState()
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
      queryFn: () => rpc.chat.getUsers(chat)
    })
    return data.find(([, name]) => name == username)?.[0]
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
        await sendJsonMessage("message", newRequest)
      }
    } else {
      await sendJsonMessage("message", rawRequest)
    }
    return { ok: true }
  } else if (parsedResult.type == "kick") {
    const uid = await getUserID(parsedResult.user)
    if (uid == undefined) return { ok: false }
    const success = await rpc.chat.kick(chat, uid)
    if (success) {
      queryClient.invalidateQueries({ queryKey: ["user-list", chat] })
    }
    return { ok: success }
  } else if (parsedResult.type == "perm-set") {
    const uid = await getUserID(parsedResult.user)
    if (uid == undefined) return { ok: false }
    const success = await rpc.chat.modifyUserPermission(chat, uid, parsedResult.name, parsedResult.value)
    return { ok: success }
  }
  return { ok: false }
}

export function useChatActionData() {
  return useActionData() as
    | {
        ok: boolean
      }
    | undefined
}

export async function settingsIndexLoader({ params }: LoaderFunctionArgs) {
  const { id } = params
  return redirect(`/chats/${id}/settings/info`)
}

export async function settingsLoader() {
  return await authLoader()
}

export async function settingsInfoLoader({ params }: LoaderFunctionArgs) {
  await authLoader()

  const { id: chatString } = params
  if (chatString === undefined) throw badRequest()

  const chat = parseInt(chatString, 10)
  if (Number.isNaN(chat)) throw badRequest()

  const inviteLink = await queryClient.fetchQuery({
    queryKey: ["get-invite-link", chat],
    queryFn: () => rpc.chat.getInviteLink(chat)
  })
  return json({ inviteLink })
}

export async function settingsActionsLoader({ params }: LoaderFunctionArgs) {
  await authLoader()

  const { id: chatString } = params
  if (chatString === undefined) throw badRequest()

  const chat = parseInt(chatString, 10)
  if (Number.isNaN(chat)) throw badRequest()

  const a = await queryClient.fetchQuery({
    queryKey: ["chat-public", chat],
    queryFn: () => rpc.chat.getPermission(chat)
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
  initBackend()
  const { username, password } = Object.fromEntries(await request.formData())
  if (typeof username != "string" || typeof password != "string") {
    throw badRequest()
  }
  const result = await rpc.user.login(username, password)
  store.getState().changeUsername(username)
  return result
}

export function useLoginActionData() {
  return useActionData() as
    | {
        success: true
        token: string
      }
    | {
        success: false
        token: null
      }
    | undefined
}

export async function registerLoader() {
  return await authLoader(false)
}

export async function registerAction({ request }: ActionFunctionArgs) {
  initBackend()
  const { username, password } = Object.fromEntries(await request.formData())
  if (typeof username != "string" || typeof password != "string") {
    throw badRequest()
  }
  const registerSuccess = await rpc.user.register(username, password)
  if (!registerSuccess)
    return {
      success: false,
      token: null
    }
  const result = await rpc.user.login(username, password)
  if (result.success) {
    store.setState({
      username
    })
  }
  return result
}

export function useRegisterActionData() {
  return useLoginActionData()
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

export function logoutLoader() {
  clearData()
  queryClient.clear()
  location.pathname = "/login"
  return new Response()
}
