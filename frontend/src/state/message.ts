import { StateCreator } from "zustand"
import { RequestWithTime } from "../config"

interface MessageState {
  messages: Record<number, RequestWithTime[]>
  markdownToHTML: Record<string, any>
  lastMessageTime: number
  addMessage: (message: RequestWithTime) => void
  addMarkdownToHTML: (msg: string, html: any) => void
  changeLastMessageTime: () => void
}

const createMessageSlice: StateCreator<MessageState> = (set) => ({
  messages: {},
  markdownToHTML: {},
  lastMessageTime: Infinity,
  addMessage(message: RequestWithTime) {
    const chat = message.req.uid
    set(value => {
      const values = value.messages
      return {
        messages: {
          ...values,
          [chat]: values[chat]?.concat?.(message) ?? [message]
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