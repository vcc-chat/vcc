import { useEffect, useState, lazy, Suspense, ReactNode, memo, useCallback } from "react"
import useWebSocket, { ReadyState } from "react-use-websocket"
import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider
} from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"

import {
  Snackbar,
  Alert,
  AlertTitle,
  CircularProgress,
  CssBaseline,
  Backdrop
} from "@mui/material"

import { WEBSOCKET_PORT, RequestType, Request, WEBSOCKET_USE_PATH } from "./config"
import { Notification, notify } from "./Notification"
import { useSelector, useDispatch, saveMessage, restoreMessage } from './store'
import { NetworkContext, responseToChatList, useChatList } from "./tools"
import { success, failed, LoginType, reset } from "./state/login"
import { changeName, changeAll } from "./state/chat"
import { addMessage, setMessages } from "./state/message"
import * as loaders from "./loaders"
import { usePlugin } from "./Plugin"

const Invite = lazy(() => import("./pages/Invite"))
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const ChatRoot = lazy(() => import("./pages/ChatRoot"))
const Chat = lazy(() => import("./pages/Chat"))
const Settings = lazy(() => import("./pages/Settings"))
const SettingsActions = lazy(() => import("./pages/SettingsActions"))
const SettingsInfo = lazy(() => import("./pages/SettingsInfo"))
const ErrorElement = lazy(() => import("./pages/ErrorElement"))

function Loading() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => setOpen(true), 300)
    return () => clearTimeout(timeout)
  }, [])
  return (
    <Backdrop open={open} className="text-white">
      <CircularProgress color="inherit" />
    </Backdrop>
  )
}

function addSuspense(children: ReactNode) {
  return (
    <Suspense fallback={<Loading />}>
      {children}
    </Suspense>
  )
}

function useMessageWebSocket(setAlertOpen: (arg1: boolean) => void) {
  const { sendJsonMessage, lastJsonMessage, lastMessage, readyState } = useWebSocket<Request>(`wss://${location.hostname}/ws/`)
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const loginStatus = useSelector(state => state.login.type)
  const { receiveHook } = usePlugin()
  const { names: chatNames, values: chatValues } = useChatList()

  const [severity, setSeverity] = useState<any>("info")
  const [alertTitle, setAlertTitle] = useState("")
  const [alertContent, setAlertContent] = useState("")

  function successAlert(content: string) {
    setAlertOpen(true)
    setSeverity("success")
    setAlertTitle("Success")
    setAlertContent(content)
  }

  function errorAlert(content: string) {
    setAlertOpen(true)
    setSeverity("error")
    setAlertTitle("Error")
    setAlertContent(content)
  }
  // string is uuid
  const [handleFunctionList, setHandleFunctionList] = useState<Record<string, (value: Request) => void>>({})

  async function makeRequest(request: Request) {
    sendJsonMessage(request)
    const result = await new Promise<Request>(res => {
      setHandleFunctionList(list => ({
        ...list,
        [request.uuid!]: res
      }))
    })
    return result
  }

  useEffect(() => {
    // legacy but required for loaders
    window._makeRequest = makeRequest
    window._sendJsonMessage = sendJsonMessage
  }, [])

  useEffect(() => {
    const message = lastJsonMessage
    if (message == null) return
    const func = handleFunctionList[message.uuid!]
    if (func != undefined) {
      func(message)
    }
    switch (message.type) {
      case RequestType.MSG_SEND:
        if (loginStatus != LoginType.LOGIN_SUCCESS) break
        (async () => {
          const newMessage = {
            req: receiveHook ? await receiveHook(message) : message,
            time: +new Date
          }
          const request = newMessage.req
          if (request == null) return
          dispatch(addMessage({
            chat: request.uid,
            message: newMessage
          }))
          notify(chatNames[chatValues.indexOf(request.uid)], `${request.usrname}: ${request.msg}`)
          saveMessage(newMessage)
          if (request.usrname == "system" && (
            request.msg.includes("join") 
            || request.msg.includes("quit") 
            || request.msg.includes("kick")
          )) {
            queryClient.invalidateQueries({
              queryKey: ["user-list", request.uid]
            })
          }
        })()
        break
      case RequestType.CTL_LJOIN:
        queryClient.setQueryData(["chat-list"], () => {
          const { values, names, parentChats } = responseToChatList(message.msg as any)
          dispatch(changeAll([values, names]))
          return { values, names, parentChats }
        })
    }
  }, [lastMessage])

  useEffect(() => {
    if (readyState !== ReadyState.CLOSED) return
    const timeout = setTimeout(() => {
      setAlertOpen(true)
      setSeverity("error")
      setAlertTitle("Error")
      setAlertContent("An unexpected error occurred. ")
    }, 2000)
    return () => clearTimeout(timeout)
  }, [readyState])

  useEffect(() => {(async () => {
    dispatch(setMessages(await restoreMessage()))
  })()}, [])
  
  return {
    sendJsonMessage(req: Request) {
      sendJsonMessage(req as any)
    },
    makeRequest,
    ready: readyState === ReadyState.OPEN,
    severity,
    alertTitle,
    alertContent,
    successAlert,
    errorAlert
  }
}
async function makeRequest(request: {
  type: RequestType,
  uid?: number,
  usrname?: string,
  msg?: string
}) {
  while (window._makeRequest === undefined) {
    await loaders.wait()
  }
  return window._makeRequest({
    type: request.type,
    uid: request.uid ?? 0,
    usrname: request.usrname ?? "",
    msg: request.msg ?? "",
    uuid: URL.createObjectURL(new Blob).slice(-36)
  })
}

async function sendJsonMessage(req: Request) {
  while (window._sendJsonMessage === undefined) {
    await loaders.wait()
  }
  window._sendJsonMessage(req)
}

window.sendJsonMessage = sendJsonMessage
window.makeRequest = makeRequest

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route errorElement={addSuspense(<ErrorElement content="500 Internal Server Error" />)}>
      <Route path="/" loader={loaders.homeLoader} />
      <Route path="/chats/invite/" element={addSuspense(<Invite />)} loader={loaders.inviteLoader} />
      <Route path="/chats/:id/" element={addSuspense(<ChatRoot />)}>
        <Route index element={addSuspense(<Chat />)} action={loaders.chatAction} loader={loaders.chatLoader} />
        <Route path="settings/" element={<Settings />}>
          <Route index loader={loaders.settingsIndexLoader} />
          <Route path="null" element={<></>} loader={loaders.settingsLoader} />
          <Route path="info" element={addSuspense(<SettingsInfo />)} loader={loaders.settingsInfoLoader} />
          <Route path="actions" element={addSuspense(<SettingsActions />)} loader={loaders.settingsActionsLoader} />
        </Route>
      </Route>
      <Route path="/login" element={addSuspense(<Login />)} loader={loaders.loginLoader} action={loaders.loginAction} />
      <Route path="/register" element={addSuspense(<Register />)} loader={loaders.registerLoader} action={loaders.registerAction} />
      <Route path="*" element={addSuspense(<ErrorElement content="404 Not Found" />)} />
    </Route>
  )
)

function SubRouter() {
  return (
    <RouterProvider router={router} />
  )
}

function App() {
  const [alertOpen, setAlertOpen] = useState(false)
  const { 
    sendJsonMessage, 
    makeRequest, 
    ready, 
    severity, 
    alertTitle, 
    alertContent,
    successAlert,
    errorAlert
  } = useMessageWebSocket(setAlertOpen)
  const handleClose = useCallback(() => {
    setAlertOpen(false)
  }, [setAlertOpen])
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CssBaseline />
      <NetworkContext.Provider value={{
        ready,
        makeRequest,
        successAlert,
        errorAlert
      }}>
        <Notification />
        <Snackbar open={alertOpen} autoHideDuration={6000} onClose={handleClose}>
          <Alert onClose={handleClose} severity={severity} className="w-full">
            <AlertTitle>{alertTitle}</AlertTitle>
            {alertContent}
          </Alert>
        </Snackbar>
        <SubRouter />
      </NetworkContext.Provider>
    </div>
  )
}

export default App
