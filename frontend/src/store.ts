import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch as useRawDispatch, useSelector as useRawSelector } from 'react-redux'
import loginReducer from "./state/login"
import chatReducer from "./state/chat"
import usernameReducer from './state/username'
import messageReducer from "./state/message"

const store = configureStore({
  reducer: {
    login: loginReducer,
    chat: chatReducer,
    username: usernameReducer,
    message: messageReducer
  }
})

export default store
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export const useDispatch: () => AppDispatch = useRawDispatch
export const useSelector: TypedUseSelectorHook<RootState> = useRawSelector