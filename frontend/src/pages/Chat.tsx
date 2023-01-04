import { useEffect, useState, useRef, useCallback, DragEvent } from "react"
import { useParams, useFetcher } from "react-router-dom"

import { RequestType, Request, RequestWithTime, MESSAGE_MIME_TYPE } from "../config"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Messages, MessageBody, MessageTitle, Message, MessageTime, MessageAvatar, MessageUsername, MessageBodyMarkdown } from "../Messages"
import { FormList, FormItem, FormInput, Form, FormInputs, Button } from "../Form"
import { Toolbar } from "../Toolbar"
import { useSelector } from "../store"
import { useChatList, useNetwork } from "../tools"

function addLeadingZero(a: string | number) {
  a = a + ""
  return a.padStart(2, "0")
}

function MessageComponent({ prevMsg, nowMsg }: {
  prevMsg: RequestWithTime | null,
  nowMsg: RequestWithTime
}) {
  const prevReq = prevMsg?.req
  const req = nowMsg.req
  const date = new Date(nowMsg.time)
  const showTitle = prevMsg == null || prevReq?.usrname != req.usrname
  const dragStartHandler = useCallback((ev: DragEvent<HTMLDivElement>) => {
    ev.dataTransfer.dropEffect = "copy"
    ev.dataTransfer.setData(MESSAGE_MIME_TYPE, JSON.stringify({
      msg: req.msg
    }))
    ev.dataTransfer.setData("text/plain", `${req.usrname}: ${req.msg}`)
  }, [req.msg])
  return (
    <Message key={+date} showTitle={showTitle}>
      {showTitle && (
        <MessageTitle>
          <MessageAvatar name={req.usrname} />
          <MessageUsername>{req.usrname}</MessageUsername>
          <MessageTime draggable onDragStart={dragStartHandler}>
            {addLeadingZero(date.getMonth() + 1)}-{addLeadingZero(date.getDate())}&nbsp;
            {addLeadingZero(date.getHours())}:{addLeadingZero(date.getMinutes())}:{addLeadingZero(date.getSeconds())}
          </MessageTime>
        </MessageTitle>
      )}
      <MessageBody>
        <MessageBodyMarkdown>
          <ReactMarkdown children={req.msg} remarkPlugins={[remarkGfm]} />
        </MessageBodyMarkdown>
        {!showTitle && <MessageTime draggable onDragStart={dragStartHandler}>
          {addLeadingZero(date.getMonth() + 1)}-{addLeadingZero(date.getDate())}&nbsp;
          {addLeadingZero(date.getHours())}:{addLeadingZero(date.getMinutes())}:{addLeadingZero(date.getSeconds())}
        </MessageTime>}
      </MessageBody>
    </Message>
  )
}

export default function Chat() {
  const [msgBody, setMsgBody] = useState("")
  const params = useParams()
  const username = useSelector(state => state.username.value)
  const { values: chats } = useChatList()
  const chatRaw = Number(params.id)
  const chat = Number.isNaN(chatRaw) || !chats.includes(chatRaw) ? null : chatRaw
  const messageHistory = useSelector(state => state.message.value)
  const messages = chat == null || messageHistory[chat] == null ? [] : messageHistory[chat]
  const { ready } = useNetwork()
  const ref = useRef<HTMLUListElement>(null)
  const fetcher = useFetcher()
  const session = useSelector(state => state.chat.session)
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
  const messagesShow = messages.filter(a => a.req.session == session)
  return (
    <>
      <FormList>
        <Messages ref={ref}>
          {messagesShow
            .reduce<[RequestWithTime | null, RequestWithTime][]>((a, b) => (
              [...a, [a.flat().at(-1)!, b]]
            ), [[null, null]] as unknown as [RequestWithTime | null, RequestWithTime][])
            .slice(1)
            .map(([prevMsg, nowMsg]) => (
              <MessageComponent prevMsg={prevMsg} nowMsg={nowMsg} key={nowMsg.time} />
            ))
          }
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
                          { msg: msgBody, session: session ?? "" },
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
            <input type="hidden" name="session" value={session ?? ""} />
            <Button disabled={!ready || chat == null} type="submit">send</Button>
          </fetcher.Form>
        </Form>
      </FormList>
      <Toolbar />
    </>
  )
}