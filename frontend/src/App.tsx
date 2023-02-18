import { useEffect } from "preact/hooks"
import { signal } from "@preact/signals"
import { lazy, Suspense, memo } from "preact/compat"

import useWebSocket, { ReadyState } from "react-use-websocket"
import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider
} from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import classNames from "classnames"
import { useTranslation } from "react-i18next"
import DoneIcon from "@material-design-icons/svg/outlined/done.svg"
import ErrorIcon from "@material-design-icons/svg/outlined/error_outline.svg"


import type { Request } from "./config"
import { Notification, notify } from "./Notification"
import { responseToChatList, useChatList } from "./tools"
import { LoginType } from "./state/login"
import useStore from "./store"
import * as loaders from "./loaders"

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

const Loading = memo(() => {
  return (
    <div className="radial-progress m-auto animate-spin" style={{"--value": 60, "--size": "3rem"} as any} />
  )
})

function useMessageWebSocket() {
  const backendAddress = useStore(state => state.backendAddress!)
  const { sendJsonMessage, lastJsonMessage, lastMessage, readyState } = useWebSocket(backendAddress)
  
  const queryClient = useQueryClient()
  const loginSuccess = useStore(state => state.type == LoginType.LOGIN_SUCCESS)
  const receiveHook = useStore(state => state.receiveHook)
  const { names: chatNames, values: chatValues } = useChatList()
  const addMessage = useStore(state => state.addMessage)
  const changeAllChats = useStore(state => state.changeAllChat)
  const setSendJsonMessageRaw = useStore(state => state.setSendJsonMessageRaw)
  const setReady = useStore(state => state.setReady)
  const errorAlert = useStore(state => state.errorAlert)
  const changeLastMessageTime = useStore(state => state.changeLastMessageTime)

  // @ts-ignore
  window.sendJsonMessage = sendJsonMessage

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
        if (!loginSuccess) break
        (async () => {
          changeLastMessageTime()
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
      console.log({ errorAlert })
      errorAlert!("Oh No! An unexpected error has occurred. ")
    }, 2000)
    return () => clearTimeout(timeout)
  }, [readyState])
}

const successAlertOpen = signal(false)
const errorAlertOpen = signal(false)
const alertContent = signal("")

function useAlert() {
  const setSuccessAlert = useStore(state => state.setSuccessAlert)
  const setErrorAlert = useStore(state => state.setErrorAlert)

  useEffect(() => {
    setSuccessAlert((content: string) => {
      successAlertOpen.value = true
      alertContent.value = content
      setTimeout(() => {
        successAlertOpen.value = false
      }, 5000)
    })
  }, [setSuccessAlert])

  useEffect(() => {
    setErrorAlert((content: string) => {
      errorAlertOpen.value = true
      alertContent.value = content
      setTimeout(() => {
        errorAlertOpen.value = false
      }, 5000)
    })
  }, [setErrorAlert])
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" errorElement={<ErrorElement content="500 Internal Server Error" />}>
      <Route index loader={loaders.homeLoader} />
      <Route path="chats">
        <Route path="invite" element={<Invite />} loader={loaders.inviteLoader} />
        <Route path="create" element={<CreateChat />} loader={loaders.createChatLoader} />
        <Route path=":id" element={<ChatRoot />}>
          <Route index element={<Chat />} action={loaders.chatAction} loader={loaders.chatLoader} />
          <Route path="settings" element={<Settings />}>
            <Route index loader={loaders.settingsIndexLoader} />
            {/* <Route path="null" element={<></>} loader={loaders.settingsLoader} /> */}
            <Route path="info" element={<SettingsInfo />} loader={loaders.settingsInfoLoader} />
            <Route path="actions" element={<SettingsActions />} loader={loaders.settingsActionsLoader} />
          </Route>
        </Route>
      </Route>
      <Route path="files/:id" element={<FileDownload />} loader={loaders.fileDownloadLoader} />
      <Route path="apps/:name" element={<App />} loader={loaders.appLoader} />
      <Route path="login" element={<Login />} loader={loaders.loginLoader} action={loaders.loginAction} />
      <Route path="register" element={<Register />} loader={loaders.registerLoader} action={loaders.registerAction} />
      <Route path="*" element={<ErrorElement content="404 Not Found" />} />
    </Route>
  )
)

function SubRouter() {
  return (
    <RouterProvider router={router} fallbackElement={<Loading />} />
  )
}

function Alert() {
  const { t } = useTranslation()
  useAlert()
  return (
    <>
      <div className={classNames("alert alert-success shadow-lg absolute left-2 bottom-2 w-auto p-5 z-50", successAlertOpen.value || "hidden")}>
        <div>
          <DoneIcon />
          <span>{t("Success")}: {alertContent}</span>
        </div>
      </div>
      <div className={classNames("alert alert-error shadow-lg absolute left-2 bottom-2 w-auto p-5 z-50", errorAlertOpen.value || "hidden")}>
        <div>
          <ErrorIcon />
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
      <Suspense fallback={<Loading />}>
        <Notification />
        <Alert />
        <SubRouter />
      </Suspense>
    </div>
  )
}
