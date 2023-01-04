import {
  redirect,
  json,
  LoaderFunctionArgs,
  useActionData,
  ActionFunctionArgs,
  useLoaderData
} from "react-router-dom"
import localforage from "localforage"

import { RequestType } from "./config"
import store from "./store"
import { change as changeUsername } from "./state/username"
import { success, reset, LoginType } from "./state/login"
import { queryClient } from "./tools"

export function wait() {
  return new Promise<void>(res=>setTimeout(res, 0))
}

async function authLoader(jumpToLogin: boolean = true) {
  const token = await localforage.getItem("token")
  const loginStatus = store.getState().login.type
  if (loginStatus == LoginType.LOGIN_SUCCESS) {
    return new Response()
  }
  if (typeof token == "string") {
    const req = await window.makeRequest({
      type: RequestType.CTL_TOKEN,
      uid: 0,
      usrname: "",
      msg: token
    })
    if (req.uid != null) {
      store.dispatch(changeUsername(req.usrname))
      store.dispatch(success())
    } else {
      localforage.removeItem("token")
      store.dispatch(reset())
      if (jumpToLogin) {
        return redirect("/login")
      }
    }
  } else {
    store.dispatch(reset())
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
  const authResult = await authLoader()
  if (authResult.status != 200) return authResult

  const url = new URL(request.url)
  const token = url.searchParams.get("token")
  if (token == null) {
    return redirect("/")
  }
  const chat = (await window.makeRequest({
    type: RequestType.CTL_CINVI,
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

export async function chatAction({ params, request }: ActionFunctionArgs) {
  const { id: chatString } = params
  const { msg, session } = Object.fromEntries(await request.formData())
  console.log({ chatString, msg, session })
  if (chatString == null || msg == null || typeof msg != "string") {
    throw badRequest()
  }
  const chat = parseInt(chatString)
  if (Number.isNaN(chat)) {
    throw badRequest()
  }
  await window.sendJsonMessage({
    uid: chat,
    type: RequestType.MSG_SEND,
    usrname: "",
    msg: msg,
    session: (session == "" ? null : session) as unknown as string
  })
  return null
}

export async function settingsIndexLoader({ params }: LoaderFunctionArgs) {
  const { id } = params
  return redirect(`/chats/${id}/settings/null`)
}

export async function settingsLoader() {
  return await authLoader()
}

export async function settingsInfoLoader({ params }: LoaderFunctionArgs) {
  const authResult = await authLoader()
  if (authResult.status != 200) return authResult

  const { id: chatString } = params
  if (chatString === undefined) throw badRequest()

  const chat = parseInt(chatString, 10)
  if (Number.isNaN(chat)) throw badRequest()

  const inviteLink = await queryClient.fetchQuery({
    queryKey: ["get-invite-link", chat],
    queryFn: async () => {
      const { msg } = await window.makeRequest({
        type: RequestType.CTL_GINVI,
        uid: chat,
        usrname: "",
        msg: ""
      })
      return `/chats/invite/?token=${msg}`
    }
  })
  return json({ inviteLink })
}

export async function settingsUsersLoader({ params }: LoaderFunctionArgs) {
  const authResult = await authLoader()
  if (authResult.status != 200) return authResult

  const { id: chatString } = params
  if (chatString === undefined) throw badRequest()

  const chat = parseInt(chatString, 10)
  if (Number.isNaN(chat)) throw badRequest()

  const [users, permission] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: ["user-list", chat],
      queryFn: async () => {
        const { msg } = await window.makeRequest({
          type: RequestType.CTL_USERS,
          uid: chat,
          usrname: "",
          msg: ""
        })
        return msg as unknown as [number, string][]
      }
    }),
    queryClient.fetchQuery({
      queryKey: ["user-permission", chat],
      queryFn: async () => {
        const { msg } = await window.makeRequest({
          type: RequestType.CTL_GPERM,
          uid: chat,
          usrname: "",
          msg: ""
        })
        return msg as unknown as Record<number, Record<string, boolean>>
      }
    })
  ])
  console.log({ users, permission })
  return json({ users, permission })
}

export async function settingsActionsLoader({ params }: LoaderFunctionArgs) {
  const authResult = await authLoader()
  if (authResult.status != 200) return authResult

  const { id: chatString } = params
  if (chatString === undefined) throw badRequest()

  const chat = parseInt(chatString, 10)
  if (Number.isNaN(chat)) throw badRequest()

  const a = await queryClient.fetchQuery({
    queryKey: ["chat-public", chat],
    queryFn: async () => {
      const { msg } = await window.makeRequest({
        type: RequestType.CTL_GCPER,
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
  const { username, password } = Object.fromEntries(await request.formData())
  if (typeof username != "string" || typeof password != "string") {
    throw badRequest()
  }
  const { uid, msg } = await window.makeRequest({
    uid: 0,
    type: RequestType.CTL_LOGIN,
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
  const { username, password } = Object.fromEntries(await request.formData())
  if (typeof username != "string" || typeof password != "string") {
    throw badRequest()
  }
  const { uid } = await window.makeRequest({
    uid: 0,
    type: RequestType.CTL_REGIS,
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

