import { createSlice, PayloadAction } from '@reduxjs/toolkit'


// session before
interface ChatType {
  value: number,
  name: string,
  values: number[]
}

const chatState: ChatType = {
  value: 1,
  name: "Default",
  values: [1]
}

const chatSlice = createSlice({
  name: "chat",
  initialState: chatState,
  reducers: {
    changeName(state: ChatType, action: PayloadAction<string>) {
      state.name = action.payload
    },
    changeValue(state: ChatType, action: PayloadAction<number>) {
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
    }
  }
})

export const { changeName, changeValue, add, remove } = chatSlice.actions

export default chatSlice.reducer