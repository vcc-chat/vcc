import { StateCreator } from "zustand"
import type { Request } from "../config"

interface PluginState {
  pluginLinks: string[]
  sendHook: ((req: Request) => Promise<Request>) | null
  receiveHook: ((req: Request) => Promise<Request>) | null
  appHook: ((name: string) => Promise<{
    html: string
  } | null>) | null
  setSendHook: (sendHook: ((req: Request) => Promise<Request>)) => void
  setReceiveHook: (receiveHook: ((req: Request) => Promise<Request>)) => void
  setAppHook: (appHook: (name: string) => Promise<{
    html: string
  } | null>) => void
}

const createPluginSlice: StateCreator<PluginState> = (set) => ({
  pluginLinks: [],
  sendHook: null,
  receiveHook: null,
  appHook: null,
  setSendHook(sendHook) {
    set({
      sendHook
    })
  },
  setReceiveHook(receiveHook) {
    set({
      receiveHook
    })
  },
  setAppHook(appHook) {
    set({
      appHook
    })
  }
})

export default createPluginSlice