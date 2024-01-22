import { StateCreator } from "zustand"
import type { NewMessageWithTime } from "../config"

interface MessageState {
  messages: Record<number, Record<string, NewMessageWithTime>>
  markdownToHTML: Record<string, any>
  lastMessageTime: number
  addMessage: (message: NewMessageWithTime) => void
  addMarkdownToHTML: (msg: string, html: any) => void
  changeLastMessageTime: () => void
}

const createMessageSlice: StateCreator<MessageState> = set => ({
  messages: {},
  markdownToHTML: {},
  lastMessageTime: Infinity,
  addMessage(message: NewMessageWithTime) {
    const chat = message.req.chat
    set(value => {
      const values = value.messages
      return {
        messages: {
          ...values,
          [chat]: { [message.req.id]: message, ...values[chat] }
        }
      }
    })
  },
  addMarkdownToHTML(msg: string, html: any) {
    set(value => ({
      markdownToHTML: {
        ...value.markdownToHTML,
        [msg]: html
      }
    }))
  },
  changeLastMessageTime() {
    set({
      lastMessageTime: Math.floor(Date.now() / 1000)
    })
  }
})

export default createMessageSlice
