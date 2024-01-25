import { useCallback, useDebugValue, useEffect, useLayoutEffect } from "preact/hooks"
import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query"

import { LoginType } from "./state/login"
import useStore from "./store"
import { wait } from "./loaders"
import rpc from "./network"
import type { NewMessageWithTime } from "./config"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      cacheTime: Infinity
    }
  }
})

const successAlertSelector = (state: ReturnType<typeof useStore.getState>) => state.successAlert
const errorAlertSelector = (state: ReturnType<typeof useStore.getState>) => state.errorAlert

export function useAlert() {
  const successAlert = useStore(successAlertSelector)
  const errorAlert = useStore(errorAlertSelector)
  return {
    successAlert,
    errorAlert
  }
}

export function stringToColor(str: string) {
  let hash = 0
  let i

  for (i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  let color = "#"

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff
    color += `00${value.toString(16)}`.slice(-2)
  }

  return color
}

export function stringToNumber(str: string) {
  let hash = 0
  let i

  for (i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  return hash
}

export function responseToChatList(
  data: {
    id: number
    name: string
    parent: number | null
    is_friend: boolean
  }[]
) {
  const values = data.map(value => value.id)
  const names = data.map(value => value.name)
  const isFriends = data.map(value => value.is_friend)
  const parentChats = Object.fromEntries(
    data
      .map<[number, number]>(({ id, parent }) => [parent ?? -1, id])
      .sort(([a], [c]) => +(a > c))
      .reduce(
        (a, [b, d]) =>
          (a.length
            ? (c => (c[0] == b ? a.slice(0, -1).concat([[b, c[1].concat(d)]]) : a.concat([[b, [d]]])))(a.at(-1)!)
            : [[b, [d]]]) as [number, number[]][],
        [] as [number, number[]][]
      )
      .map<[number, number[]]>(([a, b], i, arr) =>
        a == -1
          ? ([a, b.filter(a => !arr.map(([a]) => a).includes(a))] as [number, number[]])
          : ([a, b] as [number, number[]])
      )
      .reduce(
        (a, b) => [...a, ...(b[0] == -1 ? b[1].map(a => [a, []] as [number, number[]]) : [b])],
        [] as [number, number[]][]
      )
  ) as Record<number, number[]>
  return { values, names, parentChats, isFriends }
}

export async function queryChatList() {
  const { values, names, parentChats, isFriends } = await rpc.chat.list()
  useStore.getState().changeAllChat(values, names)
  return {
    values,
    names,
    parentChats,
    isFriends
  }
}

export const chatListPlaceholderData = {
  values: [] as number[],
  names: [],
  parentChats: {},
  isFriends: []
}

export function useChatList() {
  const enabled = useStore(state => state.type == LoginType.LOGIN_SUCCESS)
  const { isLoading, data, isFetching } = useQuery({
    queryKey: ["chat-list"],
    cacheTime: Infinity,
    placeholderData: chatListPlaceholderData,
    queryFn: queryChatList,
    enabled
  })
  const queryClient = useQueryClient()
  return Object.assign(
    {
      isLoading,
      isFetching,
      refresh: useCallback(() => {
        queryClient.invalidateQueries({
          queryKey: ["chat-list"]
        })
      }, [queryClient])
    },
    data!
  )
}

export function useChatName(chat: number | null = null) {
  const { values, names, isFriends } = useChatList()
  const userID = useStore(state => state.userID)
  const isFriend = chat === null ? false : isFriends[values.indexOf(chat)]
  const { data: users } = useQuery({
    queryKey: ["user-list", chat],
    queryFn: async () => {
      if (chat == null) return []
      return await rpc.chat.getUsers(chat)
    },
    enabled: isFriend
  })
  if (chat === null) {
    return ""
  }
  if (isFriend && users) {
    return users!.find(value => value[0] != userID)![1]
  }
  return names[values.indexOf(chat)]
}

export function useNickname(
  chat: number,
  uid: number,
  {
    enabled = true,
    initialData
  }: {
    enabled?: boolean
    initialData?: string
  }
) {
  const { data } = useQuery({
    queryKey: ["get-nickname", chat, uid],
    queryFn: () => rpc.chat.getNickname(chat, uid),
    enabled: enabled,
    ...(initialData == undefined
      ? {}
      : {
          initialData: initialData
        })
  })
  return uid == -1 ? initialData : (data === "system" ? initialData : data) ?? initialData
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} - web-vcc` : "web-vcc: vcc online"
  }, [title])
}

export function usePreload(func: () => Promise<any>) {
  useLayoutEffect(() => {
    func()
  }, [])
}

async function getChatRecord(chat: number): Promise<Array<NewMessageWithTime>> {
  const { lastMessageTime } = useStore.getState()
  return (await rpc.record.query(chat, lastMessageTime))
    .filter(({ type }) => type == "msg")
    .map(({ id, user, chat, content, time, type }) => ({
      time,
      req: { id, chat, session: null, uid: user, payload: content, type, username: null }
    }))
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker() {
  if (!navigator.serviceWorker || !window.PushManager) return
  await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  const registration = await navigator.serviceWorker.ready
  while (useStore.getState().type != LoginType.LOGIN_SUCCESS) {
    await wait()
  }
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await (async () => {
      const vapidPublicKey = await rpc.push.getVapidPublicKey()
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)
      return await registration.pushManager.subscribe({
        applicationServerKey: convertedVapidKey,
        userVisibleOnly: true
      })
    })())
  await rpc.push.register(subscription.toJSON())
}

let first = true

export async function syncMessages() {
  if (useStore.getState().type != LoginType.LOGIN_SUCCESS) return
  const { values: chats } = await queryClient.fetchQuery({
    queryKey: ["chat-list"],
    queryFn: queryChatList
  })
  const records = (await Promise.all(chats.map(getChatRecord))).flat()
  const addMessage = useStore.getState().addMessage
  // console.debug(
  //   "records: ",
  //   records.map(a => a.req)
  // )
  for (const record of records) {
    addMessage(record)
  }
  if (!first) return
  first = false
  useStore.getState().changeLastMessageTime()
}

// window.state = () => useStore
