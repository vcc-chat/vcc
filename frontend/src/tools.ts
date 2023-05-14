import { useCallback, useEffect } from "preact/hooks"
import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query"
import { persistQueryClient } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"

import type { RequestWithTime } from "./config"
import { LoginType } from "./state/login"
import useStore from "./store"
import { wait } from "./loaders"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      cacheTime: Infinity
    }
  }
})

const localStoragePersister = createSyncStoragePersister({
  storage: localStorage
})

persistQueryClient({
  queryClient,
  persister: localStoragePersister
})

const makeRequestSelector = (state: ReturnType<typeof useStore.getState>) => state.makeRequest
const successAlertSelector = (state: ReturnType<typeof useStore.getState>) => state.successAlert
const errorAlertSelector = (state: ReturnType<typeof useStore.getState>) => state.errorAlert

export function useNetwork() {
  const makeRequest = useStore(makeRequestSelector)
  const successAlert = useStore(successAlertSelector)
  const errorAlert = useStore(errorAlertSelector)
  return {
    makeRequest,
    successAlert: successAlert!,
    errorAlert: errorAlert!
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

export function responseToChatList(data: [number, string, number | null][]) {
  const values = data.map(value => value[0])
  const names = data.map(value => value[1])
  const parentChats = Object.fromEntries(
    data
      .map<[number, number]>(([a, , c]) => [c ?? -1, a])
      .sort(([a], [c]) => +(a > c))
      .reduce(
        (a, [b, d]) =>
          (a.length
            ? (c => (c[0] == b ? a.slice(0, -1).concat([[b, c[1].concat(d)]]) : a.concat([[b, [d]]])))(a.at(-1)!)
            : [[b, [d]]]) as [number, number[]][],
        [] as [number, number[]][]
      )
      .map<[number, number[]]>(([a, b], i, arr) =>
        a == -1 ? [a, b.filter(a => !arr.map(([a]) => a).includes(a))] : [a, b]
      )
      .reduce(
        (a, b) => [...a, ...(b[0] == -1 ? b[1].map(a => [a, []] as [number, number[]]) : [b])],
        [] as [number, number[]][]
      )
  ) as Record<number, number[]>
  return { values, names, parentChats }
}

export async function queryChatList() {
  const { msg: msgUntyped } = await useStore.getState().makeRequest({
    type: "chat_list"
  })
  const data = msgUntyped as unknown as [number, string, number | null][]
  const { values, names, parentChats } = responseToChatList(data)
  useStore.getState().changeAllChat(values, names)
  return {
    values,
    names,
    parentChats
  }
}

export const chatListPlaceholderData = {
  values: [] as number[],
  names: [],
  parentChats: {}
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
      }, [queryClient]),
      refetch: useCallback(() => {
        return queryClient.refetchQueries({
          queryKey: ["chat-list"]
        })
      }, [queryClient])
    },
    data!
  )
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
  } = {}
) {
  const { makeRequest } = useNetwork()
  const { data } = useQuery({
    queryKey: ["get-nickname", chat, uid],
    queryFn: async () => {
      return (
        await makeRequest({
          type: "chat_get_nickname",
          uid,
          usrname: chat as unknown as string
        })
      ).usrname
    },
    enabled: enabled,
    ...(initialData == undefined
      ? {}
      : {
          initialData: initialData
        })
  })
  return data
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} - web-vcc` : "web-vcc: vcc online"
  }, [title])
}

async function getChatRecord(chat: number) {
  const { makeRequest, lastMessageTime } = useStore.getState()
  const { msg } = await makeRequest({
    uid: chat,
    msg: lastMessageTime as any,
    type: "record_query"
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
  const { makeRequest } = useStore.getState()
  if (!navigator.serviceWorker || !window.PushManager) return
  await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await (async () => {
      const { msg: vapidPublicKey } = await makeRequest({
        type: "push_get_vapid_public_key"
      })
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)
      return await registration.pushManager.subscribe({
        applicationServerKey: convertedVapidKey,
        userVisibleOnly: true
      })
    })())
  while (useStore.getState().type != LoginType.LOGIN_SUCCESS) {
    await wait()
    await wait()
    await wait()
    await wait()
    await wait()
  }
  await makeRequest({
    type: "push_register",
    msg: subscription.toJSON() as any
  })
}

let first = true

export async function syncMessages() {
  return
  if (useStore.getState().type != LoginType.LOGIN_SUCCESS) return
  const { values: chats } = await queryClient.fetchQuery({
    queryKey: ["chat-list"],
    queryFn: queryChatList
  })
  const records = (await Promise.all(chats.map(getChatRecord))).flat()
  const addMessage = useStore.getState().addMessage
  console.debug(
    "records: ",
    records.map(a => a.req)
  )
  for (const record of records) {
    addMessage(record)
  }
  if (!first) return
  first = false
  useStore.getState().changeLastMessageTime()
}
