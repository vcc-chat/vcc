import { useEffect, useState, lazy, Suspense, ReactNode, memo, useCallback } from "react"
import styled from "@emotion/styled"
import { Global, css } from "@emotion/react"
import useWebSocket, { ReadyState } from "react-use-websocket"
import localforage from "localforage"
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
  CssBaseline
} from "@mui/material"

import { WEBSOCKET_PORT, RequestType, Request, WEBSOCKET_USE_PATH } from "./config"
import { Notification, notify } from "./Notification"
import { useSelector, useDispatch, saveMessage, restoreMessage } from './store'
import { NetworkContext, responseToChatList, useChatList } from "./tools"
import { success, failed, LoginType, reset } from "./state/login"
import { MyBackdrop } from "./Form"
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
const Plugin = lazy(() => import("./pages/Plugin"))

const Root = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const MyAlert = styled(Alert)`
  width: 100%;
`

function Loading() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => setOpen(true), 300)
    return () => clearTimeout(timeout)
  }, [])
  return (
    <MyBackdrop open={open}>
      <CircularProgress color="inherit" />
    </MyBackdrop>
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
      <Route path="/plugins" element={addSuspense(<Plugin />)} loader={loaders.pluginLoader} />
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
    <Root>
      <Global styles={css`
        html {
          --gray-50: #F8FAFC;
          --gray-100: #F1F5F9;
          --gray-200: #E2E8F0;
          --gray-300: #CBD5E1;
          --gray-400: #94A3B8;
          --gray-500: #64748B;
          --gray-600: #475569;
          --gray-700: #334155;
          --gray-800: #1E293B;
          --gray-900: #0F172A;
          --normal-weight: 400;
          --bold-weight: 700;
          --icon-font: "Material Symbols Outlined";
          scroll-behavior: smooth;
          font-size: 16px;
          line-height: 1.5;
          letter-spacing: 0.01em;
          overflow: hidden;
          font-family: "Noto Sans SC", "Open Sans", "Gill Sans", Roboto, Arial, Helvetica, sans-serif;
          font-weight: var(--normal-weight);
          letter-spacing: 0.01rem;
          background-color: var(--gray-50);
          color: var(--gray-900);
          height: 100%;
        }
        body {
          margin: 0;
          height: 100%;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }
        #root {
          height: 100%;
          display: flex;
        }
      `} />
      <CssBaseline />
      <NetworkContext.Provider value={{
        ready,
        makeRequest,
        successAlert,
        errorAlert
      }}>
        <Notification />
        <Snackbar open={alertOpen} autoHideDuration={6000} onClose={handleClose}>
          <MyAlert onClose={handleClose} severity={severity}>
            <AlertTitle>{alertTitle}</AlertTitle>
            {alertContent}
          </MyAlert>
        </Snackbar>
        <SubRouter />
      </NetworkContext.Provider>
    </Root>
  )
}

export default App
