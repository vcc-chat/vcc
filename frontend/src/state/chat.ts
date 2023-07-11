import { StateCreator } from "zustand"

interface ChatState {
  chat: number | null
  chatName: string | null
  sessions: [number, string][]
  session: string | null
  changeChatName(name: string): void
  changeChat(value: number | null): void
  changeAllChat(chats: number[], chatNames: string[]): void
  changeSession(session: string | null): void
  addSession(chat: number, session: string): void
}
const createChatSlice: StateCreator<ChatState> = set => ({
  chat: null,
  chatName: null,
  sessions: [],
  session: null,
  changeChatName(name) {
    set({
      chatName: name
    })
  },
  changeChat(value) {
    set({
      chat: value
    })
  },
  changeAllChat(chats, chatNames) {
    set(({ chat, chatName }) => {
      if (chatName == null || chat == null) {
        if (chats.length) {
          return { chat: chats[0], chatName: chatNames[0] }
        }
      }
      if (!chats.includes(chat!) || !chatNames.includes(chatName!)) {
        return { chat: chats[0], chatName: chatNames[0] }
      }
      return {}
    })
  },
  changeSession(session: string | null) {
    set({ session })
  },
  addSession(chat: number, session: string) {
    set(({ sessions }) => {
      if (sessions.find(sess => sess[0] == chat && sess[1] == session) != undefined) {
        return {}
      }
      return {
        sessions: sessions.concat([[chat, session]])
      }
    })
  }
})

export default createChatSlice
