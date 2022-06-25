import { useEffect, useState } from "react"
import styled, { createGlobalStyle } from "styled-components"
import useWebSocket, { ReadyState } from "react-use-websocket"

import { Messages, MessageBody, MessageTitle, Message, MessageTime } from "./Messages"

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

const FormList = styled.div`
  display: flex;
  flex-direction: column;
`
const FormItem = styled.div`
  display: flex;
`
const FormSelect = styled.div`
  display: flex;
  flex-direction: column;
`
const SendButtonContainer = styled.div`
  display: flex;
`

const FormBottom = styled.div`
  visibility: hidden;
  margin-top: auto;
`

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
    scrollbar-width: thin;
    font-family: "Noto Sans SC", "Open Sans", "Gill Sans", Roboto, Arial, Helvetica, sans-serif;
    font-weight: var(--normal-weight);
    letter-spacing: 0.01rem;
    background-color: var(--gray-50);
    color: var(--gray-900)
  }

`

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
  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];
  return (
    <>
      <GlobalStyle />
      <FormList>
        {!!messageHistory.length && (
          <Messages>
            {messageHistory.map(a => {
              const req = a.req
              const date = new Date(a.time)
              return (
                <Message key={a.time}>
                  <MessageTitle>{req.usrname}<MessageTime>{date.getMonth()}-{date.getDate()} {date.getHours()}:{date.getMinutes()}</MessageTime></MessageTitle>
                  <MessageBody>{req.msg}</MessageBody>
                </Message>
              )
            })}
          </Messages>
        )}
        <FormBottom />
        <span>Type: {connectionStatus}</span>
        <FormItem>user name: <input onChange={event => setUsername(event.target.value)} value={username}></input></FormItem>
        <FormItem>body: <input onChange={event => setMsgBody(event.target.value)} value={msgBody}></input></FormItem>
        <FormItem>
          type: 
          <select onChange={event => setMsgType(+event.target.value)} value={msgType}>
            <option value={REQ.MSG_SEND}>send</option>
            <option value={REQ.CTL_LOGIN}>login</option>
          </select>
        </FormItem>
        <SendButtonContainer>
          <button onClick={() => {
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
    </>
  )
}

export default App
