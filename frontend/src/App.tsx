import { useEffect, useRef, useState } from "react"
import CssBaseline from '@mui/material/CssBaseline'
import styled, { createGlobalStyle } from "styled-components"
import useWebSocket, { ReadyState } from "react-use-websocket"


import { WEBSOCKET_PORT, VCC_MAGIC, RequestType, Request, RequestWithTime } from "./config"
import { Messages, MessageBody, MessageTitle, Message, MessageTime } from "./Messages"
import { FormList, FormItem, FormInput, Form, FormInputs, Button, LoginDialog, LoginErrorDialog } from "./Form"
import { Toolbar } from "./Toolbar"
import { Notification, notify } from "./Notification"
import { useSelector, useDispatch } from './store'
import { success, failed } from "./state/login"


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
`

function addLeadingZero(a: string | number) {
  a = a + ""
  return a.padStart(2, "0")
}

function useMessageWebSocket() {
  const { sendJsonMessage, lastJsonMessage, lastMessage, readyState } = useWebSocket(`ws://${location.hostname}:${WEBSOCKET_PORT}`)
  const [messageHistory, setMessageHistory] = useState<RequestWithTime[]>([])
  const dispatch = useDispatch()
  useEffect(() => {
    const message = lastJsonMessage as unknown as Request
    if (lastJsonMessage !== null) {
      if (message.type == RequestType.CTL_LOGIN) {
        if (message.uid == 0) {
          dispatch(failed())
        } else {
          dispatch(success())
        }
      } else if (message.type == RequestType.MSG_NEW || message.type === RequestType.REL_NEW) {
        setMessageHistory(messageHistory.concat({
          time: new Date,
          req: message
        }))
        notify(message.usrname, message.msg)
      }
    }
    console.log(lastJsonMessage)
  }, [lastMessage, setMessageHistory])
  
  return {
    messageHistory,
    setMessageHistory,
    sendJsonMessage(req: Request) {
      sendJsonMessage(req as any)
    },
    ready: readyState === ReadyState.OPEN
  }
}

function App() {
  const { messageHistory, setMessageHistory, sendJsonMessage, ready } = useMessageWebSocket()
  const [msgBody, setMsgBody] = useState("")
  const username = useSelector(state => state.username.value)
  const session = useSelector(state => state.session.value)
  const send = () => {
    if (!msgBody)
      return
    const msg: Request = {
      magic: VCC_MAGIC,
      uid: 0,
      session,
      flags: 0,
      type: RequestType.MSG_SEND,
      usrname: username,
      msg: msgBody
    }
    setMessageHistory(messageHistory.concat({
      time: new Date,
      req: msg
    }))
    setMsgBody("")
    sendJsonMessage(msg)
  }
  return (
    <Root>
      <GlobalStyle />
      <CssBaseline />
      <Notification />
      <LoginDialog sendJsonMessage={sendJsonMessage} />
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
                      {addLeadingZero(date.getMonth())}-{addLeadingZero(date.getDate())} 
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
              <FormInput required multiline type="text" label="message" variant="filled" fullWidth onChange={event => setMsgBody(event.target.value)} value={msgBody} />
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
