import { StateCreator } from "zustand"
import type { NewMessage, SendMessage } from "../config"

interface PluginState {
  pluginLinks: string[]
  sendHook: ((req: SendMessage) => Promise<SendMessage | null>) | null
  receiveHook: ((req: NewMessage) => Promise<NewMessage>) | null
  appHook:
    | ((name: string) => Promise<{
        html: string
      } | null>)
    | null
  setSendHook: (sendHook: (req: SendMessage) => Promise<SendMessage>) => void
  setReceiveHook: (receiveHook: (req: NewMessage) => Promise<NewMessage>) => void
  setAppHook: (
    appHook: (name: string) => Promise<{
      html: string
    } | null>
  ) => void
}

const createPluginSlice: StateCreator<PluginState> = set => ({
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
