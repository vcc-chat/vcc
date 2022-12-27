import { createSlice, PayloadAction } from "@reduxjs/toolkit"

// session before
interface ChatType {
  value: number | null,
  name: string | null,
  values: number[],
  names: string[]
}

const chatState: ChatType = {
  value: null,
  name: null,
  values: [],
  names: []
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
    add(state: ChatType, action: PayloadAction<number>) {
      if (!state.values.includes(action.payload))
        state.values.push(action.payload)
    },
    remove(state: ChatType, action: PayloadAction<number>) {
      const index = state.values.indexOf(action.payload)
      if (!~index) return
      state.values.splice(index, 1)
    },
    changeAll(state: ChatType, action: PayloadAction<[number, string][]>) {
      const { payload } = action
      state.values = payload.map(value => value[0])
      state.names = payload.map(value => value[1])
      if (state.name == null || state.value == null) {
        if (payload) {
          state.value = state.values[0]
          state.name = state.names[0]
        }
        return
      }
      if (!payload.includes([state.value, state.name])) {
        state.value = state.values[0]
        state.name = state.names[0]
      }
    }
  }
})

export const { changeName, changeValue, add, remove, changeAll } = chatSlice.actions

export default chatSlice.reducer