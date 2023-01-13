import { StateCreator } from "zustand"
import { RequestWithTime } from "../config"

interface MessageState {
  messages: Record<number, RequestWithTime[]>
  addMessage: (message: RequestWithTime) => void
}

const createMessageSlice: StateCreator<MessageState> = (set) => ({
  messages: {},
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
  }
})

export default createMessageSlice