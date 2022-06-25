import { useEffect, useRef, useState } from "react"
import styled, { createGlobalStyle } from "styled-components"
import useWebSocket, { ReadyState } from "react-use-websocket"

import { Messages, MessageBody, MessageTitle, Message, MessageTime } from "./Messages"
import { FormList, FormBottom, FormItem, FormSelect, SendButtonContainer } from "./Form"

const VCC_MAGIC = 0x01328e22

const enum REQ {
  MSG_SEND = 1,
  MSG_NEW = 2,
  CTL_USRS = 3,
  CTL_LOGIN = 4,
  CTL_NEWSE = 5,
  CTL_SESS = 6,
  CTL_JOINS = 7,
  CTL_UINFO = 8,
  SYS_SCRINC = 9,
  REL_MSG = 10,
  REL_NEW = 11,
  CTL_IALOG = 12,
  SYS_INFO = 13,
  CTL_SENAME = 14
}

interface Request {
  magic: number
  type: number
  uid: number
  session: number
  flags: number
  usrname: string
  msg: string
}

interface RequestWithTime {
  time: number
  req: Request
}

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

`

const Root = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 100vh;
`

function addLeadingZero(a: string | number) {
  a = a + ""
  return a.padStart(2, "0")
}

function App() {
  const { sendJsonMessage, lastJsonMessage, lastMessage, readyState } = useWebSocket(`ws://${location.hostname}:7000`)
  const [messageHistory, setMessageHistory] = useState<RequestWithTime[]>([])
  const [username, setUsername] = useState("")
  const [msgType, setMsgType] = useState(REQ.MSG_SEND)
  const [msgBody, setMsgBody] = useState("")
  useEffect(() => {
    if (lastJsonMessage !== null) {
      setMessageHistory(messageHistory.concat({
        time: +new Date,
        req: lastJsonMessage as unknown as Request
      }))
    }
    console.log(lastJsonMessage)
  }, [lastMessage, setMessageHistory])
  return (
    <Root>
      <GlobalStyle />
      <FormList>
        {!!messageHistory.length && (
          <Messages>
            {messageHistory.map(a => {
              const req = a.req
              const date = new Date(a.time)
              return (
                <Message key={a.time}>
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
        <FormBottom />
        <FormItem>user name: <input onChange={event => setUsername(event.target.value)} value={username}></input></FormItem>
        <FormItem>
          {msgType == REQ.CTL_LOGIN ? "password" : "body"}: <input onChange={event => setMsgBody(event.target.value)} value={msgBody} />
        </FormItem>
        <FormItem>
          type: 
          <select onChange={event => setMsgType(+event.target.value)} value={msgType}>
            <option value={REQ.MSG_SEND}>send</option>
            <option value={REQ.CTL_LOGIN}>login</option>
          </select>
        </FormItem>
        <SendButtonContainer>
          <button disabled={readyState !== ReadyState.OPEN} onClick={() => {
            const msg: Request = {
              magic: VCC_MAGIC,
              uid: 0,
              session: 0,
              flags: 0,
              type: msgType,
              usrname: username,
              msg: msgBody
            }
            if (msgType == REQ.MSG_SEND) {
              setMessageHistory(messageHistory.concat({
                time: +new Date,
                req: msg
              }))
            }
            
            sendJsonMessage(msg as any)
          }}>send</button>
        </SendButtonContainer>
      </FormList>
    </Root>
  )
}

export default App
