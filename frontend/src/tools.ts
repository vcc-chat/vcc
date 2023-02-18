import { useCallback, useEffect, useMemo } from "preact/hooks"
import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query"
import { persistQueryClient } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { type Signal, effect } from "@preact/signals"

import type { RequestType, Request, RequestWithTime } from "./config"
import { LoginType } from "./state/login"
import useStore from "./store"

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
  let hash = 0;
  let i;

  for (i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }

  return color;
}

export function stringToNumber(str: string) {
  let hash = 0;
  let i;

  for (i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return hash;
}

export function responseToChatList(data: [number, string, number | null][]) {
  const values = data.map(value => value[0])
  const names = data.map(value => value[1])
  const parentChats = Object.fromEntries(
    data
      .map<[number, number]>(([a, b, c]) => [c ?? -1, a])
      .sort(([a, b], [c, d]) => +(a > c))
      .reduce((a, [b, d]) => (
        a.length ? (
          c => c[0] == b ? (
            a.slice(0, -1).concat([[b, c[1].concat(d)]])
          ) : a.concat([[b, [d]]])
        )(a.at(-1)!) : [[b, [d]]]
      ) as [number, number[]][], [] as [number, number[]][])
      .map<[number, number[]]>(([a, b], i, arr) => (
        a == -1 ? [a, b.filter(a => !arr.map(([a, b]) => a).includes(a))] : [a, b]
      ))
      .reduce((a, b) => [
        ...a, ...(b[0] == -1 ? b[1].map(a => [a, []] as [number, number[]]) : [b])
      ], [] as [number, number[]][])
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
  return Object.assign({
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
  }, data!)
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} - web-vcc` : "web-vcc: vcc online"
  }, [title])
}

export function persistSignal<T>(signal: Signal<T>, key: string) {
  const data = localStorage.getItem(key)
  if (data) {
    const obj = JSON.parse(data)
    signal.value = obj
  }
  effect(() => {
    localStorage.setItem(key, JSON.stringify(signal.value))
  })
}

async function getChatRecord(chat: number) {
  const { makeRequest, lastMessageTime } = useStore.getState()
  const { msg: url } = await makeRequest({
    uid: 1,
    msg: (lastMessageTime / 1000) as any,
    type: "record_query"
  })
  if (!url) return []
  const response = await fetch(url)
  const rawText = await response.text()
  return rawText.split("\n").slice(1, -1).map<RequestWithTime>(dataString => {
    const data = JSON.parse(dataString)
    return {
      req: {
        ...data,
        usrname: data.username,
        type: "message"
      },
      // need to be changed
      time: Date.now()
    }
  })
}

export async function syncMessages() {
  if (useStore.getState().type != LoginType.LOGIN_SUCCESS) return
  const { values: chats } = await queryClient.fetchQuery({
    queryKey: ["chat-list"],
    queryFn: queryChatList
  })
  const records = (await Promise.all(chats.map(chat => getChatRecord(chat)))).flat()
  const addMessage = useStore.getState().addMessage
  for (const record of records) {
    addMessage(record)
  }
  useStore.getState().changeLastMessageTime(+new Date)
}
