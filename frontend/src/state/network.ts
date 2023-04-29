import { StateCreator } from "zustand"
import type { Request, RequestType } from "../config"
import { wait } from "../loaders"

interface NetworkState {
  backendAddress: string | null
  setBackendAddress: (address: string) => void
  ready: boolean
  setReady: (ready: boolean) => void
  handleFunctionList: Record<string, (value: Request) => void>
  sendJsonMessageRaw: ((request: Request) => void) | null
  setSendJsonMessageRaw: (func: (request: Request) => void) => void
  sendJsonMessage: (request: Request) => Promise<void>
  makeRequest: (request: { type: RequestType; uid?: number; usrname?: string; msg?: string }) => Promise<Request>
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
  async sendJsonMessage(req: Request) {
    while (!get().sendJsonMessageRaw) await wait()
    const { sendJsonMessageRaw } = get()
    sendJsonMessageRaw!(req)
  },
  async makeRequest(request) {
    const { sendJsonMessage } = get()
    const uuid = URL.createObjectURL(new Blob()).slice(-36)
    sendJsonMessage({
      type: request.type,
      uid: request.uid ?? 0,
      usrname: request.usrname ?? "",
      msg: request.msg ?? "",
      uuid
    })
    const result = await new Promise<Request>(res => {
      set(state => ({
        handleFunctionList: {
          ...state.handleFunctionList,
          [uuid!]: res
        }
      }))
    })
    return result
  }
})

export default createNetworkSlice
