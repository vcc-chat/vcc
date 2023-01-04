import { createSlice, PayloadAction } from "@reduxjs/toolkit"

// session before
interface ChatType {
  value: number | null,
  name: string | null,
  sessions: [number, string][],
  session: string | null
}

const chatState: ChatType = {
  value: null,
  name: null,
  sessions: [],
  session: null
}

const chatSlice = createSlice({
  name: "chat",
  initialState: chatState,
  reducers: {
    changeName(state: ChatType, action: PayloadAction<string>) {
      state.name = action.payload
    },
    changeValue(state: ChatType, action: PayloadAction<number | null>) {
      state.value = action.payload
    },
    changeAll(state: ChatType, action: PayloadAction<[number[], string[]]>) {
      const { payload } = action
      const [values, names] = payload
      if (state.name == null || state.value == null) {
        if (payload) {
          state.value = values[0]
          state.name = names[0]
        }
        return
      }
      if (!~payload.findIndex(a => a[0] == state.value && a[1] == state.name)) {
        state.value = values[0]
        state.name = names[0]
      }
    },
    addSession(state: ChatType, action: PayloadAction<[number, string]>) {
      const { payload } = action
      if (!~state.sessions.findIndex(([a, b]) => a == payload[0] && b == payload[1])) {
        state.sessions.push(payload)
      }
    },
    changeSession(state: ChatType, action: PayloadAction<string | null>) {
      const { payload } = action
      state.session = payload
    }
  }
})

export const { changeName, changeValue, changeAll, addSession, changeSession } = chatSlice.actions

export default chatSlice.reducer