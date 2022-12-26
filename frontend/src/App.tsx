import { useEffect, useState } from "react"
import CssBaseline from '@mui/material/CssBaseline'
import styled, { createGlobalStyle } from "styled-components"
import useWebSocket, { ReadyState } from "react-use-websocket"

import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import AlertTitle from "@mui/material/AlertTitle"
import AppBar from "@mui/material/AppBar"
import Typography from "@mui/material/Typography"
import Toolbar2 from "@mui/material/Toolbar"

import { WEBSOCKET_PORT, RequestType, Request, RequestWithTime, WEBSOCKET_USE_PATH } from "./config"
import { Messages, MessageBody, MessageTitle, Message, MessageTime } from "./Messages"
import { FormList, FormItem, FormInput, Form, FormInputs, Button, LoginDialog } from "./Form"
import { Toolbar } from "./Toolbar"
import { Notification, notify } from "./Notification"
import { useSelector, useDispatch } from './store'
import { success, failed, LoginType } from "./state/login"
import { changeName } from "./state/chat"


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
    color: var(--gray-900)
  }
  body {
    margin: 0;
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }

`

const Root = styled.div`
  display: flex;
  height: 100vh;
  flex-direction: column;
`

const MyAlert = styled(Alert)`
  width: 100%;
`

function addLeadingZero(a: string | number) {
  a = a + ""
  return a.padStart(2, "0")
}

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
    console.log(message)
    if (message == null) return

    switch (message.type) {
      case RequestType.CTL_LOGIN:
        dispatch(message.uid ? success() : failed())
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
      case RequestType.CTL_NEWSE:
        configureAlert(
          `You have created the chat successfully, join it with id ${message.uid}. `, 
          "Unexpected error: You haven't created the chat successfully. "
        )
        break
      case RequestType.CTL_QUITS:
        configureAlert(
          "You have quit the chat successfully. ", 
          "Unexpected error: You haven't quit the chat successfully. "
        )
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
  const [msgBody, setMsgBody] = useState("")
  const username = useSelector(state => state.username.value)
  const chat = useSelector(state => state.chat.value)
  const chatName = useSelector(state => state.chat.name)
  const send = () => {
    if (!msgBody)
      return
    if (!ready)
      return
    const msg: Request = {
      uid: chat,
      type: RequestType.MSG_SEND,
      usrname: username,
      msg: msgBody
    }
    setMsgBody("")
    sendJsonMessage(msg)
  }
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
      <div>
        <AppBar position="static">
          <Toolbar2>
            <Typography variant="h6" component="div">
              {chatName}
            </Typography>
          </Toolbar2>
        </AppBar>
      </div>
      <FormList>
        {!!messageHistory.length && (
          <Messages>
            {messageHistory.map(a => {
              const req = a.req
              const date = a.time
              return (
                <Message key={+date}>
                  <MessageTitle>
                    {req.usrname}
                    <MessageTime>
                      {addLeadingZero(date.getMonth() + 1)}-{addLeadingZero(date.getDate())}&nbsp;
                      {addLeadingZero(date.getHours())}:{addLeadingZero(date.getMinutes())}
                    </MessageTime>
                  </MessageTitle>
                  <MessageBody>{req.msg}</MessageBody>
                </Message>
              )
            })}
          </Messages>
        )}
        <Form>
          <FormInputs>
            <FormItem>
              <FormInput 
                multiline 
                type="text" 
                label="Message" 
                variant="filled" 
                fullWidth 
                onChange={event => {
                  setMsgBody(event.target.value)
                }} 
                onKeyDown={event => {
                  if (event.keyCode == 10 || event.keyCode == 13) {
                    if (event.ctrlKey || event.metaKey) {
                      setMsgBody(msgBody + "\n")
                    } else {
                      send()
                      event.preventDefault()
                    }
                  }
                }}
                value={msgBody} 
              />
            </FormItem>
          </FormInputs>
          <Button disabled={!ready} onClick={send}>send</Button>
        </Form>
      </FormList>
      <Toolbar sendJsonMessage={sendJsonMessage} />
    </Root>
  )
}

export default App
