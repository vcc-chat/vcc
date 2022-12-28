import styled from "styled-components"
import { useEffect, useState } from "react"
import { Link, useParams, useNavigate, Outlet } from "react-router-dom"

import Typography from "@mui/material/Typography"
import Divider from "@mui/material/Divider"

import { RequestType, Request } from "../config"
import { Messages, MessageBody, MessageTitle, Message, MessageTime } from "../Messages"
import { FormList, FormItem, FormInput, Form, FormInputs, Button } from "../Form"
import { Toolbar } from "../Toolbar"
import { MainLayout } from "../Sidebar"
import { useDispatch, useSelector } from "../store"
import { useNetwork } from "../hooks"
import { useAuth } from "../hooks"
import { changeName, changeValue } from "../state/chat"

function addLeadingZero(a: string | number) {
  a = a + ""
  return a.padStart(2, "0")
}

const SettingsTitle = styled(Typography)`
  margin-bottom: 0.5em;
`

const SettingsItem = styled.div`
  margin-bottom: 0.5em;
  font-size: 1.1em;
`

const SettingsDivider = styled(Divider)`
  margin-bottom: 0.7em;
`

const SettingsRoot = styled.div`
  padding: 2em;
  display: flex;
  flex-direction: column;
`

const SettingsLink = styled(Link)`
  color: var(--gray-500);
  &:hover {
    color: var(--gray-700);
  }
`

export function ChatSettings(props: {}) {
  const chat = useSelector(state => state.chat.value)
  const chatName = useSelector(state => state.chat.name)
  if (chat == null || chatName == null) {
    return (
      <div />
    )
  }
  return (
    <SettingsRoot>
      <SettingsTitle variant="h5">Basic Information</SettingsTitle>
      <SettingsDivider />
      <SettingsItem>Name: {chatName}</SettingsItem>
      <SettingsItem>ID: {chat}</SettingsItem>
      <SettingsItem>Invite Link: <SettingsLink to={`/chats/invite/${chat}`}>{location.origin}/chats/invite/{chat}</SettingsLink></SettingsItem>
    </SettingsRoot>
  )
}

export default function Chat(props: {}) {
  const params = useParams()
  const chats = useSelector(state => state.chat.values)
  const chatRaw = Number(params.id)
  const chat = Number.isNaN(chatRaw) || !chats.includes(chatRaw) ? null : chatRaw
  const chatNow = useSelector(state => state.chat.value)
  const chatNames = useSelector(state => state.chat.names)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  
  useAuth()

  useEffect(() => {
    if (chatNow != chat) {
      dispatch(changeValue(chat))
      dispatch(changeName(chat == null ? "" : chatNames[chats.indexOf(chat)]))
    }
  }, [chat, chatNow])

  useEffect(() => {
    if (chat == null && chats.length) {
      navigate(`/chats/${chats[0]}`)
    }
  }, [chat, chats])
  return (
    <>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </>
  )
}
export function ChatChat() {
  const [msgBody, setMsgBody] = useState("")
  const params = useParams()
  const username = useSelector(state => state.username.value)
  const chats = useSelector(state => state.chat.values)
  const chatRaw = Number(params.id)
  const chat = Number.isNaN(chatRaw) || !chats.includes(chatRaw) ? null : chatRaw
  const messageHistory = useSelector(state => state.message.value)
  const messages = chat == null || messageHistory[chat] == null ? [] : messageHistory[chat]
  const { sendJsonMessage, ready } = useNetwork()
  const send = () => {
    if (!msgBody)
      return
    if (!ready)
      return
    if (chat == null)
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
  return (
    <>
      <FormList>
        <Messages>
          {messages.map(a => {
            const req = a.req
            const date = new Date(a.time)
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
        <Form>
          <FormInputs>
            <FormItem>
              <FormInput 
                multiline 
                type="text" 
                label="Message" 
                variant="filled" 
                disabled={!ready || chat == null}
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
          <Button disabled={!ready || chat == null} onClick={send}>send</Button>
        </Form>
      </FormList>
      <Toolbar />
    </>
  )
}