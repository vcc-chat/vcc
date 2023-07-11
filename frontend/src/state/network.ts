import { StateCreator } from "zustand"
import type { Message, RequestType } from "../config"
import { wait } from "../loaders"

interface NetworkState {
  backendAddress: string | null
  setBackendAddress: (address: string) => void
  ready: boolean
  setReady: (ready: boolean) => void
  handleFunctionList: Record<string, (value: Message) => void>
  sendJsonMessageRaw: ((method: string, request: Message) => void) | null
  setSendJsonMessageRaw: (func: null | ((method: string, request: Message) => void)) => void
  sendJsonMessage: (method: string, request: Message) => Promise<void>
  makeRequest: (
    method: string,
    request: { type: RequestType; uid?: number; usrname?: string; msg?: string }
  ) => Promise<Message>
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
  handleFunctionList: {},
  sendJsonMessageRaw: null,
  setSendJsonMessageRaw(func) {
    set(() => ({
      sendJsonMessageRaw: func
    }))
  },
  async sendJsonMessage(method, request) {
    let sendJsonMessageRaw
    while (!(sendJsonMessageRaw = get().sendJsonMessageRaw)) await wait()
    sendJsonMessageRaw(method, request)
  },
  async makeRequest(method, request) {
    const { sendJsonMessage } = get()
    const uuid = URL.createObjectURL(new Blob()).slice(-36)
    sendJsonMessage(method, {
      ...request,
      uuid
    } as any)
    const result = await new Promise<Message>(res => {
      set(state => ({
        handleFunctionList: {
          ...state.handleFunctionList,
          [uuid]: res
        }
      }))
    })
    return result
  }
})

export default createNetworkSlice
