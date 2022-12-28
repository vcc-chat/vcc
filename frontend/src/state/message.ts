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
    addMessage(state, action: PayloadAction<{
      chat: number,
      message: RequestWithTime
    }>) {
      const { chat, message } = action.payload
      if (Object.hasOwn(state.value, chat)) {
        state.value[chat].push(message)
      } else {
        state.value[chat] = [message]
      }
    }
  }
})

export const { addMessage } = messageSlice.actions

export default messageSlice.reducer