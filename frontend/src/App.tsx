import { useEffect, useRef, useState } from "react"
import styled, { createGlobalStyle } from "styled-components"
import useWebSocket, { ReadyState } from "react-use-websocket"
import { ReactNotifications } from "react-notifications-component"
import 'react-notifications-component/dist/theme.css'


import { WEBSOCKET_PORT, VCC_MAGIC, REQ, Request, RequestWithTime } from "./config"
import { Messages, MessageBody, MessageTitle, Message, MessageTime } from "./Messages"
import { FormList, FormItem, SendButton, FormInput, Form, FormInputBig, FormInputs, Toolbar } from "./Form"


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
  useEffect(() => {
    if (lastJsonMessage !== null) {
      setMessageHistory(messageHistory.concat({
        time: new Date,
        req: lastJsonMessage as unknown as Request
      }))
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
  const [username, setUsername] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [msgBody, setMsgBody] = useState("")
  const send = () => {
    const msg: Request = {
      magic: VCC_MAGIC,
      uid: 0,
      session: 0,
      flags: 0,
      type: isLogin ? REQ.CTL_LOGIN : REQ.MSG_SEND,
      usrname: username,
      msg: msgBody
    }
    if (isLogin == false) {
      setMessageHistory(messageHistory.concat({
        time: new Date,
        req: msg
      }))
      
    } else if (isLogin == true) {
      setIsLogin(false)
    }
    setMsgBody("")
    sendJsonMessage(msg)
  }
  return (
    <Root id="app-root">
      <GlobalStyle />
      <ReactNotifications />
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
                      {addLeadingZero(date.getMonth())}-{addLeadingZero(date.getDate())} {addLeadingZero(date.getHours())}:{addLeadingZero(date.getMinutes())}
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
              <FormInput disabled={isLogin !== true} required type="text" placeholder="user name" onChange={event => setUsername(event.target.value)} value={username} />
            </FormItem>
            <FormItem>
              <Toolbar sendMessage={sendJsonMessage} msgBody={msgBody} username={username} />
            </FormItem>
            <FormItem>
              <FormInputBig required type="text" placeholder={isLogin == true ? "password" : "body"} onChange={event => setMsgBody(event.target.value)} value={msgBody} onKeyPress={event => {
                if (event.key == "Enter") {
                  send()
                }
              }} />
            </FormItem>
          </FormInputs>
          <SendButton disabled={!ready} onClick={send}>{isLogin == true ? "login" : "send"}</SendButton>
        </Form>
      </FormList>
    </Root>
  )
}

export default App
