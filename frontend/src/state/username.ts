import { createSlice, PayloadAction } from '@reduxjs/toolkit'


// username
interface UsernameType {
  value: string
}

const usernameState: UsernameType = {
  value: ""
}

const usernameSlice = createSlice({
  name: "username",
  initialState: usernameState,
  reducers: {
    change(state: UsernameType, action: PayloadAction<string>) {
      state.value = action.payload
    }
  }
})

export const { change } = usernameSlice.actions

export default usernameSlice.reducer