import { useEffect, useState, lazy, Suspense, ReactNode, memo } from "react"
import CssBaseline from '@mui/material/CssBaseline'
import styled, { createGlobalStyle } from "styled-components"
import useWebSocket, { ReadyState } from "react-use-websocket"
import localforage from "localforage"
import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  redirect,
  json
} from "react-router-dom"

import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import AlertTitle from "@mui/material/AlertTitle"
import CircularProgress from "@mui/material/CircularProgress"

import { WEBSOCKET_PORT, RequestType, Request, WEBSOCKET_USE_PATH } from "./config"
import { Notification, notify } from "./Notification"
import { useSelector, useDispatch, saveMessage, restoreMessage } from './store'
import { NetworkContext } from "./hooks"
import { success, failed, LoginType, reset } from "./state/login"
import { MyBackdrop } from "./Form"
import { changeName, changeAll } from "./state/chat"
import { addMessage, setMessages } from "./state/message"
import * as loaders from "./loaders"

const Invite = lazy(() => import("./pages/Invite"))
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const ChatRoot = lazy(() => import("./pages/ChatRoot"))
const Chat = lazy(() => import("./pages/Chat"))
const ChatSettings = lazy(() => import("./pages/Settings"))
const ErrorElement = lazy(() => import("./pages/ErrorElement"))

const GlobalStyle = createGlobalStyle`
  html {
    /* some colors copied from tailwind */
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
    /* some font weights */
    --normal-weight: 400;
    --bold-weight: 700;
    /* fonts */
    --icon-font: "Material Symbols Outlined";
    /* settings */
    scroll-behavior: smooth;
    font-size: 16px;
    line-height: 1.5;
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
`

const Root = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const MyAlert = styled(Alert)`
  width: 100%;
`

const Loading = memo(function Loading() {
  return (
    <MyBackdrop open={true}>
      <CircularProgress color="inherit" />
    </MyBackdrop>
  )
})

function addSuspense(children: ReactNode) {
  return (
    <Suspense fallback={<Loading />}>
      {children}
    </Suspense>
  )
}

function useMessageWebSocket(setAlertOpen: (arg1: boolean) => void) {
  const protocol = location.protocol == "http:" ? "ws" : "wss"
  const { sendJsonMessage, lastJsonMessage, lastMessage, readyState } = (useWebSocket<Request>(
    !WEBSOCKET_USE_PATH
    ? `${protocol}://${location.hostname}:${WEBSOCKET_PORT}/` 
    : `${protocol}://${location.hostname}/ws/`
  ))
  const dispatch = useDispatch()
  const loginStatus = useSelector(state => state.login.type)

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

  function configureAlert(successContent: string, errorContent: string) {
    setAlertOpen(true)
    if (lastJsonMessage.uid) {
      setSeverity("success")
      setAlertTitle("Success")
      setAlertContent(successContent)
    } else {
      setSeverity("error")
      setAlertTitle("Error")
      setAlertContent(errorContent)
    }
  }
  // number is RequestType
  const [handleFunctionList, setHandleFunctionList] = useState<Record<string, Array<(value: Request) => void>>>({})

  async function makeRequest(request: Request) {
    sendJsonMessage(request)
    return await new Promise<Request>(res => {
      setHandleFunctionList(list => {
        if (list[request.type] == undefined) {
          list[request.type] = [res]
        } else {
          list[request.type].unshift(res)
        }
        return list
      })
    })
  }

  useEffect(() => {
    // legacy but required for loaders
    window._makeRequest = makeRequest
    window._sendJsonMessage = sendJsonMessage
  }, [])

  useEffect(() => {
    const message = lastJsonMessage
    console.log({ message })
    if (message == null) return
    const list = handleFunctionList[message.type]
    if (list instanceof Array && list.length) {
      list.pop()!(message)
      setHandleFunctionList(handleFunctionList)
      return
    }
    switch (message.type) {
      case RequestType.MSG_SEND:
        if (loginStatus != LoginType.LOGIN_SUCCESS) break
        dispatch(addMessage({
          chat: message.uid,
          message: {
            time: +new Date,
            req: message
          }
        }))
        notify(message.usrname, message.msg)
        saveMessage({
          time: +new Date,
          req: message
        })
        break
      case RequestType.CTL_JOINS:
        if (message.uid) {
          dispatch(changeName(message.usrname))
        }
        configureAlert("You have joined the chat successfully. ", "No such chat. ")
        break
      case RequestType.CTL_LJOIN:
        dispatch(changeAll(message.msg as any))
        break
    }
  }, [lastMessage])

  useEffect(() => {
    if (readyState !== ReadyState.CLOSED) return
    setAlertOpen(true)
    setSeverity("error")
    setAlertTitle("Error")
    setAlertContent("An unexpected error occurred. ")
    
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

async function makeRequest(req: Request) {
  // hateful trick but work
  while (window._makeRequest === undefined) {
    await loaders.wait()
  }
  return await window._makeRequest(req)
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
        <Route path="settings" element={addSuspense(<ChatSettings />)} loader={loaders.settingsLoader} />
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
  const handleClose = () => {
    setAlertOpen(false)
  }
  return (
    <Root>
      <GlobalStyle />
      <CssBaseline />
      <NetworkContext.Provider value={{
        sendJsonMessage, 
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
