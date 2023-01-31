import { createContext, useCallback, useContext, useEffect, useMemo } from "react"
import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query"
import { persistQueryClient } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { broadcastQueryClient } from "@tanstack/query-broadcast-client-experimental"

import { RequestType, Request } from "./config"
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

broadcastQueryClient({
  queryClient,
  broadcastChannel: "web-vcc"
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

export function useChatList() {
  const enabled = useStore(state => state.type) == LoginType.LOGIN_SUCCESS
  const changeAll = useStore(state => state.changeAllChat)
  const makeRequest = useStore(state => state.makeRequest)
  const { isLoading, data, isFetching } = useQuery({
    queryKey: ["chat-list"],
    cacheTime: Infinity,
    placeholderData: useMemo(() => ({
      values: [] as number[],
      names: [],
      parentChats: {}
    }), []),
    queryFn: async () => {
      const { msg: msgUntyped } = await makeRequest({
        type: "chat_list"
      })
      const data = msgUntyped as unknown as [number, string, number | null][]
      const { values, names, parentChats } = responseToChatList(data)
      changeAll(values, names)
      return {
        values,
        names,
        parentChats
      }
    },
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
    }, [queryClient])
  }, data!)
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}