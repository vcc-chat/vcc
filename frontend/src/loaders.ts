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
  return await authLoader()
}

export async function chatAction({ params, request }: ActionFunctionArgs) {
  const { id: chatString } = params
  const { msg } = Object.fromEntries(await request.formData())
  console.log({ chatString, msg })
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
    msg: msg
  })
  return null
}

export async function settingsLoader({ params }: LoaderFunctionArgs) {
  const authResult = await authLoader()
  if (authResult.status != 200) return authResult

  const { id: chatString } = params
  if (chatString === undefined) throw badRequest()

  const chat = parseInt(chatString, 10)
  if (Number.isNaN(chat)) throw badRequest()

  const [users, permission, inviteLink] = await Promise.all([
    (async () => {
      const { msg } = await window.makeRequest({
        type: RequestType.CTL_USERS,
        uid: chat,
        usrname: "",
        msg: ""
      })
      return msg as unknown as [number, string][]
    })(),
    (async () => {
      const { msg } = await window.makeRequest({
        type: RequestType.CTL_GPERM,
        uid: chat,
        usrname: "",
        msg: ""
      })
      return msg as unknown as Record<number, Record<string, boolean>>
    })(),
    (async () => {
      const { msg } = await window.makeRequest({
        type: RequestType.CTL_GINVI,
        uid: chat,
        usrname: "",
        msg: ""
      })
      return `/chats/invite/?token=${msg}`
    })()
  ])
  return json({ users, permission, inviteLink })
}

export function useSettingsLoaderData() {
  return useLoaderData() as {
    users: [number, string][]
    permission: Record<number, Record<string, boolean>>
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

