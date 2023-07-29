import { StateCreator } from "zustand"
import type { Message, SendMessage } from "../config"

interface PluginState {
  pluginLinks: string[]
  sendHook: ((req: SendMessage) => Promise<SendMessage | null>) | null
  receiveHook: ((req: Message) => Promise<Message>) | null
  appHook:
    | ((name: string) => Promise<{
        html: string
      } | null>)
    | null
  setSendHook: (sendHook: (req: SendMessage) => Promise<SendMessage>) => void
  setReceiveHook: (receiveHook: (req: Message) => Promise<Message>) => void
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
