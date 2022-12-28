import styled from "styled-components"
import { useEffect, useState, useRef } from "react"
import { Link, useParams, useNavigate, Outlet } from "react-router-dom"

import Typography from "@mui/material/Typography"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemText from "@mui/material/ListItemText"
import TextField from "@mui/material/TextField"
import PureButton from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import DeleteIcon from "@mui/icons-material/Delete"

import { RequestType, Request } from "../config"
import { Messages, MessageBody, MessageTitle, Message, MessageTime } from "../Messages"
import { FormList, FormItem, FormInput, Form, FormInputs, Button } from "../Form"
import { Toolbar } from "../Toolbar"
import { MainLayout } from "../Sidebar"
import { useDispatch, useSelector } from "../store"
import { useNetwork, useAuth } from "../hooks"
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
  & + ${SettingsTitle} {
    margin-top: 0.3em;
  }
`

const SettingsDivider = styled(Divider)`
  margin-bottom: 0.7em;
`

const SettingsRoot = styled.div`
  padding: 2em;
  display: flex;
  flex-direction: column;
  & + ${SettingsTitle} {
    margin-top: 0.3em;
  }
`

const SettingsLink = styled(Link)`
  color: var(--gray-500);
  &:hover {
    color: var(--gray-700);
  }
`

const SettingsList = styled(List)`
  border: 1px solid var(--gray-200);
  border-radius: 0.2em;
`

const SettingsFormItem = styled.div`
  display: flex;
`

const SettingsButton = styled(PureButton)`
  margin-top: auto;
  margin-bottom: auto;
  margin-right: auto;
  margin-left: 1em;
`

export function ChatSettings(props: {}) {
  const chat = useSelector(state => state.chat.value)
  const chatName = useSelector(state => state.chat.name)
  const username = useSelector(state => state.username.value)
  const { makeRequest, sendJsonMessage } = useNetwork()
  const [users, setUsers] = useState<[number, string][]>([])
  const [renameValue, setRenameValue] = useState("")

  useEffect(() => {
    if (chat == null || chatName == null) return
    (async () => {
      const request = await makeRequest({
        type: RequestType.CTL_USERS,
        uid: chat,
        usrname: "",
        msg: ""
      })
      setUsers(request.msg as any)
    })()
    setRenameValue(chatName)
  }, [])

  if (chat == null || chatName == null) {
    return (
      <div />
    )
  }

  async function rename() {
    sendJsonMessage({
      type: RequestType.CTL_RNAME,
      uid: chat!,
      usrname: "",
      msg: renameValue
    })
  }

  return (
    <SettingsRoot>
      <SettingsTitle variant="h5">Basic Information</SettingsTitle>
      <SettingsDivider />
      <SettingsItem>Name: {chatName}</SettingsItem>
      <SettingsItem>ID: {chat}</SettingsItem>
      <SettingsItem>Invite Link: <SettingsLink to={`/chats/invite/${chat}`}>{location.origin}/chats/invite/{chat}</SettingsLink></SettingsItem>
      <SettingsTitle variant="h5">Joined users</SettingsTitle>
      <SettingsDivider />
      <SettingsList>
        {users.map(obj => (
          <ListItem key={obj[0]} secondaryAction={obj[1] == username ? undefined : (
            <IconButton edge="end" onClick={() => {
              sendJsonMessage({
                type: RequestType.CTL_KICK,
                uid: chat,
                usrname: "",
                msg: obj[0] as any
              })
            }}>
              <DeleteIcon />
            </IconButton>
          )}>
            <ListItemText
              primary={obj[1]}
              secondary={`id: ${obj[0]}`}
            />
          </ListItem>
        ))}
      </SettingsList>
      <SettingsTitle variant="h5">Actions</SettingsTitle>
      <SettingsDivider />
      <SettingsFormItem>
        <TextField label="Rename" value={renameValue} onChange={ev => {
          setRenameValue(ev.target.value)
        }} />
        <SettingsButton disabled={renameValue == chatName} onClick={rename}>Change</SettingsButton>
      </SettingsFormItem>
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
  const ref = useRef<HTMLUListElement>(null)
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
  useEffect(() => {
    if (ref.current == null) return
    ref.current.scrollTo(0, ref.current!.scrollHeight) 
  }, [chat])
  useEffect(() => {
    if (ref.current == null) return
    if ((ref.current as any).scrollTopMax != undefined && (ref.current as any).scrollTopMax - ref.current.scrollTop < 150) {
      ref.current.scrollTo(0, ref.current.scrollHeight) 
    }
  }, [messages])
  return (
    <>
      <FormList>
        <Messages ref={ref}>
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