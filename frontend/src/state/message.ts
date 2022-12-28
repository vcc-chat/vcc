import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { Request, RequestWithTime } from "../config"

interface MessageType {
  value: Record<number, RequestWithTime[]>
}

const messageState: MessageType = {
  value: {}
}

const messageSlice = createSlice({
  name: "message",
  initialState: messageState,
  reducers: {
    add(state, action: PayloadAction<{
      chat: number,
      message: RequestWithTime
    }>) {
      const { chat, message } = action.payload
      if (Object.hasOwn(state.value, chat)) {
        const messages = state.value[chat]
        const lastMessage = messages.at(-1)!
        if (lastMessage.req.usrname == message.req.usrname) {
          lastMessage.req.msg += `\n${message.req.msg}`
          lastMessage.time = message.time
        } else {
          messages.push(message)
        }
      } else {
        state.value[chat] = [message]
      }
    },
    set(state, action: PayloadAction<Record<number, RequestWithTime[]>>) {
      state.value = action.payload
    }
  }
})

export const { add: addMessage, set: setMessages } = messageSlice.actions

export default messageSlice.reducer