import { useEffect, useState, useRef } from "react"
import { useParams, useFetcher } from "react-router-dom"

import { RequestType, Request } from "../config"
import { Messages, MessageBody, MessageTitle, Message, MessageTime } from "../Messages"
import { FormList, FormItem, FormInput, Form, FormInputs, Button } from "../Form"
import { Toolbar } from "../Toolbar"
import { useSelector } from "../store"
import { useNetwork } from "../hooks"

function addLeadingZero(a: string | number) {
  a = a + ""
  return a.padStart(2, "0")
}

export default function Chat() {
  const [msgBody, setMsgBody] = useState("")
  const params = useParams()
  const username = useSelector(state => state.username.value)
  const chats = useSelector(state => state.chat.values)
  const chatRaw = Number(params.id)
  const chat = Number.isNaN(chatRaw) || !chats.includes(chatRaw) ? null : chatRaw
  const messageHistory = useSelector(state => state.message.value)
  const messages = chat == null || messageHistory[chat] == null ? [] : messageHistory[chat]
  const { ready } = useNetwork()
  const ref = useRef<HTMLUListElement>(null)
  const fetcher = useFetcher()
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
          <fetcher.Form method="post" onSubmit={() => {
            setMsgBody("")
          }}>
            <FormInputs>
              <FormItem>
                <FormInput 
                  multiline 
                  name="msg"
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
                        fetcher.submit(
                          { msg: msgBody },
                          { method: "post" }
                        )
                        setMsgBody("")
                        event.preventDefault()
                      }
                    }
                  }}
                  value={msgBody} 
                />
              </FormItem>
            </FormInputs>
            <Button disabled={!ready || chat == null} type="submit">send</Button>
          </fetcher.Form>
        </Form>
      </FormList>
      <Toolbar />
    </>
  )
}