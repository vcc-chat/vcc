import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch as useRawDispatch, useSelector as useRawSelector } from 'react-redux'
import localforage from 'localforage'
import type { RequestWithTime } from './config'
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

let messagesCached: RequestWithTime[] = []

export async function saveMessage(msg: RequestWithTime) {
  messagesCached.push(msg)
  await localforage.setItem("messages", messagesCached)
}

export async function restoreMessage() {
  messagesCached = await localforage.getItem<RequestWithTime[]>("messages") ?? []
  let messages: Record<number, RequestWithTime[]> = {}
  for (const i of messagesCached) {
    if (messages[i.req.uid]) {
      messages[i.req.uid].push(i)
    } else {
      messages[i.req.uid] = [i]
    }
  }
  return messages
}