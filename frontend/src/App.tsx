import { useEffect, useState } from "react"
import CssBaseline from '@mui/material/CssBaseline'
import styled, { createGlobalStyle } from "styled-components"
import useWebSocket, { ReadyState } from "react-use-websocket"
import localforage from "localforage"
import {
  Route,
  BrowserRouter,
  Routes
} from "react-router-dom"

import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import AlertTitle from "@mui/material/AlertTitle"

import { WEBSOCKET_PORT, RequestType, Request, RequestWithTime, WEBSOCKET_USE_PATH } from "./config"
import { LoginDialog } from "./Form"
import { Notification, notify } from "./Notification"
import { useSelector, useDispatch } from './store'
import { success, failed, LoginType, reset } from "./state/login"
import { change as changeUsername } from "./state/username"
import { changeName, changeAll } from "./state/chat"

import Home from "./pages/Home"
import Invite from "./pages/Invite"

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
`

const MyAlert = styled(Alert)`
  width: 100%;
`


function useMessageWebSocket(setAlertOpen: (arg1: boolean) => void) {
  const protocol = location.protocol == "http:" ? "ws" : "wss"
  const { sendJsonMessage, lastJsonMessage, lastMessage, readyState } = (useWebSocket<Request>(
    !WEBSOCKET_USE_PATH
    ? `${protocol}://${location.hostname}:${WEBSOCKET_PORT}/` 
    : `${protocol}://${location.hostname}/ws/`
  ))
  const [messageHistory, setMessageHistory] = useState<RequestWithTime[]>([])
  const dispatch = useDispatch()
  const loginStatus = useSelector(state => state.login.type)

  const [severity, setSeverity] = useState<any>("info")
  const [alertTitle, setAlertTitle] = useState("")
  const [alertContent, setAlertContent] = useState("")

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

  useEffect(() => {
    const message = lastJsonMessage
    console.log({ message })
    if (message == null) return

    switch (message.type) {
      case RequestType.CTL_LOGIN:
        if (message.uid) {
          dispatch(success())
          localforage.setItem("token", message.msg)
        } else {
          dispatch(failed())
        }
        break
      case RequestType.CTL_TOKEN:
        if (message.uid != null) {
          dispatch(changeUsername(message.usrname))
          dispatch(success())
        } else {
          localforage.removeItem("token")
          dispatch(reset())
        }
        break
      case RequestType.MSG_SEND:
        if (loginStatus != LoginType.LOGIN_SUCCESS) break
        setMessageHistory(messageHistory.concat({
          time: new Date,
          req: message
        }))
        notify(message.usrname, message.msg)
        break
      case RequestType.CTL_JOINS:
        if (message.uid) {
          dispatch(changeName(message.usrname))
        }
        configureAlert("You have joined the chat successfully. ", "No such chat. ")
        break
      case RequestType.CTL_REGIS:
        configureAlert(
          "The account has been registered successfully. \nYou can login now. ", 
          "Operation failed. "
        )
        break
      case RequestType.CTL_NEWSE:
        configureAlert(
          `You have created the chat successfully. `, 
          "Unexpected error: You haven't created the chat successfully. "
        )
        if (message.uid) {
          sendJsonMessage({
            uid: message.uid,
            type: RequestType.CTL_JOINS,
            usrname: "",
            msg: ""
          })
          sendJsonMessage({
            uid: 0,
            type: RequestType.CTL_LJOIN,
            usrname: "",
            msg: ""
          })
        }
        break
      case RequestType.CTL_QUITS:
        configureAlert(
          "You have quit the chat successfully. ", 
          "Unexpected error: You haven't quit the chat successfully. "
        )
        break
      case RequestType.CTL_SNAME:
        // This should be deprecated: use RequestType.CTL_LJOIN instead
        dispatch(changeName(message.usrname))
        break
      case RequestType.CTL_LJOIN:
        dispatch(changeAll(message.msg as any))
        break
    }
  }, [lastMessage, setMessageHistory])

  useEffect(() => {
    if (readyState !== ReadyState.CLOSED) return
    setAlertOpen(true)
    setSeverity("error")
    setAlertTitle("Error")
    setAlertContent("An unexpected error occurred. ")
    
  }, [readyState])
  
  return {
    messageHistory,
    sendJsonMessage(req: Request) {
      sendJsonMessage(req as any)
    },
    ready: readyState === ReadyState.OPEN,
    severity,
    alertTitle,
    alertContent
  }
}

function App() {
  const [alertOpen, setAlertOpen] = useState(false)
  const { messageHistory, sendJsonMessage, ready, severity, alertTitle, alertContent } = useMessageWebSocket(setAlertOpen)
  const handleClose = () => {
    setAlertOpen(false)
  }
  return (
    <Root>
      <GlobalStyle />
      <CssBaseline />
      <Notification />
      <LoginDialog sendJsonMessage={sendJsonMessage} />
      <Snackbar open={alertOpen} autoHideDuration={6000} onClose={handleClose}>
        <MyAlert onClose={handleClose} severity={severity}>
          <AlertTitle>{alertTitle}</AlertTitle>
          {alertContent}
        </MyAlert>
      </Snackbar>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home sendJsonMessage={sendJsonMessage} messageHistory={messageHistory} ready={ready} />} />
          <Route path="/chat/invite/:id" element={<Invite sendJsonMessage={sendJsonMessage} ready={ready} />} />
        </Routes>
      </BrowserRouter>
    </Root>
  )
}

export default App
