import { useEffect, useRef } from "preact/hooks"
import { lazy, Suspense, memo } from "preact/compat"

import useWebSocket, { ReadyState } from "react-use-websocket"
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import DoneIcon from "@material-design-icons/svg/outlined/done.svg"
import ErrorIcon from "@material-design-icons/svg/outlined/error_outline.svg"

import type { Request } from "./config"
import { Notification } from "./components/Notification"
import { responseToChatList } from "./tools"
import { LoginType } from "./state/login"
import useStore from "./store"
import * as loaders from "./loaders"

const ErrorElement = lazy(() => import("./pages/ErrorElement"))

const Loading = memo(() => {
  return <div className="radial-progress m-auto animate-spin" style={{ "--value": 60, "--size": "3rem" } as any} />
})

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" errorElement={<ErrorElement content="500 Internal Server Error" />}>
      <Route index loader={loaders.homeLoader} />
      <Route path="chats">
        <Route path="invite" lazy={() => import("./pages/Invite")} loader={loaders.inviteLoader} />
        <Route path="create" lazy={() => import("./pages/CreateChat")} loader={loaders.createChatLoader} />
        <Route path=":id" lazy={() => import("./pages/ChatRoot")}>
          <Route index lazy={() => import("./pages/Chat")} action={loaders.chatAction} loader={loaders.chatLoader} />
          <Route path="settings" lazy={() => import("./pages/Settings")}>
            <Route index loader={loaders.settingsIndexLoader} />
            {/* <Route path="null" element={<></>} loader={loaders.settingsLoader} /> */}
            <Route path="info" lazy={() => import("./pages/SettingsInfo")} loader={loaders.settingsInfoLoader} />
            <Route
              path="actions"
              lazy={() => import("./pages/SettingsActions")}
              loader={loaders.settingsActionsLoader}
            />
          </Route>
        </Route>
      </Route>
      <Route path="files/:id" lazy={() => import("./pages/FileDownload")} loader={loaders.fileDownloadLoader} />
      <Route path="apps/:name" lazy={() => import("./pages/App")} loader={loaders.appLoader} />
      <Route
        path="login"
        lazy={() => import("./pages/Login")}
        loader={loaders.loginLoader}
        action={loaders.loginAction}
      />
      <Route
        path="register"
        lazy={() => import("./pages/Register")}
        loader={loaders.registerLoader}
        action={loaders.registerAction}
      />
      <Route path="*" element={<ErrorElement content="404 Not Found" />} />
      <Route path="logout" loader={loaders.logoutLoader} />
    </Route>
  )
)

function useMessageWebSocket() {
  const backendAddress = useStore(state => state.backendAddress!)
  const { sendJsonMessage, lastJsonMessage, lastMessage, readyState } = useWebSocket(backendAddress, {
    shouldReconnect: ({ code }) => code != 1000 && code != 1001
  })

  const queryClient = useQueryClient()
  const loginSuccess = useStore(state => state.type == LoginType.LOGIN_SUCCESS)
  const receiveHook = useStore(state => state.receiveHook)
  const addMessage = useStore(state => state.addMessage)
  const changeAllChats = useStore(state => state.changeAllChat)
  const setSendJsonMessageRaw = useStore(state => state.setSendJsonMessageRaw)
  const setReady = useStore(state => state.setReady)
  const errorAlert = useStore(state => state.errorAlert)
  const changeLastMessageTime = useStore(state => state.changeLastMessageTime)
  const tokenLogin = useStore(state => state.tokenLogin)
  const loginType = useStore(state => state.type)
  const firstTimeConnect = useRef(true)
  useEffect(() => {
    if (readyState != ReadyState.CONNECTING) return
    console.log(1)
    if (firstTimeConnect.current) {
      firstTimeConnect.current = false
      return
    }
    if (loginType != LoginType.LOGIN_SUCCESS) return
    tokenLogin()
    // This is an internal api, but we use it since this don't need it run in react router's context
    router.revalidate()
  }, [readyState])
  ;(window as any).sendJsonMessage = sendJsonMessage

  useEffect(() => {
    setSendJsonMessageRaw(sendJsonMessage)
  }, [sendJsonMessage])

  useEffect(() => {
    setReady(readyState === ReadyState.OPEN)
  }, [readyState])

  const handleFunctionList = useStore(state => state.handleFunctionList)

  useEffect(() => {
    const message: Request = lastJsonMessage
    if (message == null) return
    const func = handleFunctionList[message.uuid!]
    if (func != undefined) {
      func(message)
      return
    }
    switch (message.type) {
      case "message":
        if (!loginSuccess) break
        ;(async () => {
          changeLastMessageTime()
          if (message.msg == "") return
          const newMessage = {
            req: receiveHook ? await receiveHook(message) : message,
            time: +new Date()
          }
          const request = newMessage.req
          if (request == null) return
          addMessage(newMessage)
          // notify(chatNames[chatValues.indexOf(request.uid)], `${request.usrname}: ${request.msg}`)
          if (
            request.usrname == "system" &&
            (request.msg.includes("join") || request.msg.includes("quit") || request.msg.includes("kick"))
          ) {
            queryClient.invalidateQueries({
              queryKey: ["user-list", request.uid]
            })
          }
        })()
        break
      case "chat_list":
        queryClient.setQueryData(["chat-list"], () => {
          const { values, names, parentChats } = responseToChatList(message.msg as any)
          changeAllChats(values, names)
          return { values, names, parentChats }
        })
        break
      default:
        console.error("Uncaught message: ", { message })
    }
  }, [lastMessage])

  useEffect(() => {
    if (readyState !== ReadyState.CLOSED) return
    const timeout = setTimeout(() => {
      console.log({ errorAlert })
      errorAlert("Oh No! The connection between server and client is interupted, reconnecting...")
    }, 2000)
    return () => clearTimeout(timeout)
  }, [readyState])
}

function SubRouter() {
  return <RouterProvider router={router} fallbackElement={<Loading />} />
}

function Alert() {
  const { t } = useTranslation()
  const alerts = useStore(state => state.alerts)
  return (
    <>
      {alerts.map(({ type, content }) => (
        <div
          className={`alert ${
            type === "success" ? "alert-success" : "alert-error"
          } shadow-lg absolute left-2 bottom-2 w-auto p-5 z-50`}
          key={`${type} ${content}`}
        >
          <div>
            {type === "success" ? <DoneIcon /> : <ErrorIcon />}
            <span>
              {t(type[0].toUpperCase() + type.slice(1))}: {content}
            </span>
          </div>
        </div>
      ))}
    </>
  )
}

function WebSocket() {
  useMessageWebSocket()
  return null
}

export default function RootApp() {
  const backendAddress = useStore(state => state.backendAddress)
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {!!backendAddress && <WebSocket />}
      <Suspense fallback={<Loading />}>
        <Notification />
        <Alert />
        <SubRouter />
      </Suspense>
    </div>
  )
}
