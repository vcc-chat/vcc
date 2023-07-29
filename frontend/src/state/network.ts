import { StateCreator } from "zustand"
import type { Message, RequestType } from "../config"
import { wait } from "../loaders"
import type { MethodType } from "../methodtype"

type MakeRequestType = <K extends keyof MethodType>(
  method: K,
  request: Parameters<MethodType[K]>[0] extends undefined ? void : Parameters<MethodType[K]>[0]
) => Promise<ReturnType<MethodType[K]>>

interface NetworkState {
  backendAddress: string | null
  setBackendAddress: (address: string) => void
  ready: boolean
  setReady: (ready: boolean) => void
  makeRequestRaw: MakeRequestType | null
  makeRequest: MakeRequestType
}

const createNetworkSlice: StateCreator<NetworkState> = (set, get) => ({
  backendAddress: null,
  setBackendAddress(address) {
    set({ backendAddress: address })
  },
  ready: false,
  setReady(ready) {
    set({
      ready
    })
  },
  makeRequestRaw: null,
  async makeRequest(method, request) {
    let makeRequestRaw
    while (!(makeRequestRaw = get().makeRequestRaw)) await wait()
    return await makeRequestRaw(method, request)
  }
})

export default createNetworkSlice
