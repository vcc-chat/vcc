import { useEffect, useState, lazy, Suspense, ReactNode, memo, useCallback, useRef } from "react"
import useWebSocket, { ReadyState } from "react-use-websocket"
import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider
} from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"

import type { Request } from "./config"
import { Notification, notify } from "./Notification"
import { responseToChatList, useChatList } from "./tools"
import { LoginType } from "./state/login"
import useStore from "./store"
import * as loaders from "./loaders"
import classNames from "classnames"
import { useTranslation } from "react-i18next"

const Invite = lazy(() => import("./pages/Invite"))
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const ChatRoot = lazy(() => import("./pages/ChatRoot"))
const Chat = lazy(() => import("./pages/Chat"))
const Settings = lazy(() => import("./pages/Settings"))
const SettingsActions = lazy(() => import("./pages/SettingsActions"))
const SettingsInfo = lazy(() => import("./pages/SettingsInfo"))
const ErrorElement = lazy(() => import("./pages/ErrorElement"))
const CreateChat = lazy(() => import("./pages/CreateChat"))
const FileDownload = lazy(() => import("./pages/FileDownload"))
const App = lazy(() => import("./pages/App"))
const ChooseBackend = lazy(() => import("./pages/ChooseBackend"))

const Loading = memo(() => {
  return (
    <div className="radial-progress m-auto animate-spin" style={{"--value": 60, "--size": "3rem"} as any} />
  )
})

function useMessageWebSocket() {
  const backendAddress = useStore(state => state.backendAddress!)
  const { sendJsonMessage, lastJsonMessage, lastMessage, readyState } = useWebSocket<Request>(backendAddress)
  const queryClient = useQueryClient()
  const loginSuccess = useStore(state => state.type != LoginType.LOGIN_SUCCESS)
  const receiveHook = useStore(state => state.receiveHook)
  const { names: chatNames, values: chatValues } = useChatList()
  const addMessage = useStore(state => state.addMessage)
  const changeAllChats = useStore(state => state.changeAllChat)
  const setSendJsonMessageRaw = useStore(state => state.setSendJsonMessageRaw)
  const setReady = useStore(state => state.setReady)
  const errorAlert = useStore(state => state.errorAlert)

  useEffect(() => {
    setSendJsonMessageRaw(sendJsonMessage)
  }, [sendJsonMessage])

  useEffect(() => {
    setReady(readyState === ReadyState.OPEN)
  }, [readyState])

  const handleFunctionList = useStore(state => state.handleFunctionList)

  useEffect(() => {
    const message = lastJsonMessage
    if (message == null) return
    const func = handleFunctionList[message.uuid!]
    if (func != undefined) {
      func(message)
      return
    }
    switch (message.type) {
      case "message":
        if (loginSuccess) break
        (async () => {
          if (message.msg == "") return
          const newMessage = {
            req: receiveHook ? await receiveHook(message) : message,
            time: +new Date
          }
          const request = newMessage.req
          if (request == null) return
          addMessage(newMessage)
          notify(chatNames[chatValues.indexOf(request.uid)], `${request.usrname}: ${request.msg}`)
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
      errorAlert!("An unexpected error occurred. ")
    }, 2000)
    return () => clearTimeout(timeout)
  }, [readyState])
}

function useAlert(setSuccessAlertOpen: (open: boolean) => void, setErrorAlertOpen: (open: boolean) => void) {
  const setSuccessAlert = useStore(state => state.setSuccessAlert)
  const setErrorAlert = useStore(state => state.setErrorAlert)

  const [alertContent, setAlertContent] = useState("")

  const successAlert = useCallback((content: string) => {
    setSuccessAlertOpen(true)
    setAlertContent(content)
    setTimeout(() => {
      setSuccessAlertOpen(false)
    }, 5000)
    console.trace()
  }, [setSuccessAlertOpen, setAlertContent])

  useEffect(() => {
    setSuccessAlert(successAlert)
  }, [successAlert])

  const errorAlert = useCallback((content: string) => {
    setErrorAlertOpen(true)
    setAlertContent(content)
    setTimeout(() => {
      setErrorAlertOpen(false)
    }, 5000)
    console.trace()
  }, [setErrorAlertOpen, setAlertContent])

  useEffect(() => {
    setErrorAlert(errorAlert)
  }, [errorAlert])
  
  return {
    alertContent
  }
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route errorElement={<ErrorElement content="500 Internal Server Error" />} loader={loaders.chooseBackendLoader}>
      <Route path="/" loader={loaders.homeLoader} />
      <Route path="/choose-backend" element={<ChooseBackend />} />
      <Route path="/chats/invite/" element={<Invite />} loader={loaders.inviteLoader} />
      <Route path="/chats/create/" element={<CreateChat />} loader={loaders.createChatLoader} />
      <Route path="/chats/:id/" element={<ChatRoot />}>
        <Route index element={<Chat />} action={loaders.chatAction} loader={loaders.chatLoader} />
        <Route path="settings/" element={<Settings />}>
          <Route index loader={loaders.settingsIndexLoader} />
          <Route path="null" element={<></>} loader={loaders.settingsLoader} />
          <Route path="info" element={<SettingsInfo />} loader={loaders.settingsInfoLoader} />
          <Route path="actions" element={<SettingsActions />} loader={loaders.settingsActionsLoader} />
        </Route>
      </Route>
      <Route path="/files/:id" element={<FileDownload />} loader={loaders.fileDownloadLoader} />
      <Route path="/apps/:name" element={<App />} loader={loaders.appLoader} />
      <Route path="/login" element={<Login />} loader={loaders.loginLoader} action={loaders.loginAction} />
      <Route path="/register" element={<Register />} loader={loaders.registerLoader} action={loaders.registerAction} />
      <Route path="*" element={<ErrorElement content="404 Not Found" />} />
    </Route>
  )
)

function SubRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <RouterProvider router={router} fallbackElement={<Loading />} />
    </Suspense>
  )
}

function Alert() {
  const [successAlertOpen, setSuccessAlertOpen] = useState(false)
  const [errorAlertOpen, setErrorAlertOpen] = useState(false)
  const { t } = useTranslation()
  const { 
    alertContent
  } = useAlert(setSuccessAlertOpen, setErrorAlertOpen)
  return (
    <>
      <div className={classNames("alert alert-success shadow-lg absolute left-2 bottom-2 w-auto p-5 z-50", successAlertOpen || "hidden")}>
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6 fill-none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{t("Success")}: {alertContent}</span>
        </div>
      </div>
      <div className={classNames("alert alert-error shadow-lg absolute left-2 bottom-2 w-auto p-5 z-50", errorAlertOpen || "hidden")}>
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6 fill-none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{t("Error")}! {alertContent}</span>
        </div>
      </div>
    </>
  )
}

function WebSocket() {
  useMessageWebSocket()
  return null
}

export default function () {
  const backendAddress = useStore(state => state.backendAddress)
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {!!backendAddress && <WebSocket />}
      <Notification />
      <Alert />
      <SubRouter />
    </div>
  )
}
