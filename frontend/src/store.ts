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

function copy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export async function saveMessage(msgRaw: RequestWithTime) {
  const msg: RequestWithTime = copy(msgRaw)
  const req1 = msg.req
  const req2 = messagesCached.at(-1)?.req
  messagesCached.push(msg)
  await localforage.setItem("messages", messagesCached)
}

export async function restoreMessage() {
  messagesCached = (await localforage.getItem<RequestWithTime[]>("messages")) ?? []
  let messages: Record<number, RequestWithTime[]> = {}
  for (const i of messagesCached) {
    if (messages[i.req.uid]) {
      messages[i.req.uid].push(copy(i))
    } else {
      messages[i.req.uid] = [copy(i)]
    }
  }
  return messages
}