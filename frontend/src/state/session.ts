import { createSlice, PayloadAction } from '@reduxjs/toolkit'


// session
interface SessionType {
  value: number
}

const sessionState: SessionType = {
  value: 0
}

const sessionSlice = createSlice({
  name: "session",
  initialState: sessionState,
  reducers: {
    change(state: SessionType, action: PayloadAction<number>) {
      state.value = action.payload
    }
  }
})

export const { change } = sessionSlice.actions

export default sessionSlice.reducer