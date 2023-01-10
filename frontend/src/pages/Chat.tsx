import { useEffect, useState, useRef, useCallback, DragEvent, memo } from "react"
import { useParams, useFetcher } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkGithub, { Options as RemarkGithubOptions } from "remark-github"
import { TextField, Button } from "@mui/material"
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism"

import { RequestType, Request, RequestWithTime, MESSAGE_MIME_TYPE } from "../config"
import { MessageAvatar, MessageLink } from "../Messages"
import { Toolbar } from "../Toolbar"
import { useSelector } from "../store"
import { useChatList, useNetwork } from "../tools"
import { useChatActionData, wait } from "../loaders"

function addLeadingZero(a: string | number) {
  a = a + ""
  return a.padStart(2, "0")
}


const MessageComponent = memo(function MessageComponent({ prevMsg, nowMsg }: {
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
    <li key={nowMsg.time} className={`group hover:bg-gray-100 list-none mx-0.5 px-1 pb-0 ${showTitle ? "mt-0.5 pt-1 rounded" : "mt-0 pt-0"}`}>
      <div className={`flex text-xl font-bold break-all ${showTitle ? "" : "hidden"}`}>
        <MessageAvatar name={req.usrname} />
        <div className="my-auto ml-1">{req.usrname}</div>
        <div draggable onDragStart={dragStartHandler} className="m-auto mr-4 hidden group-hover:block text-gray-500 text-xs font-normal">
          {addLeadingZero(date.getMonth() + 1)}-{addLeadingZero(date.getDate())}&nbsp;
          {addLeadingZero(date.getHours())}:{addLeadingZero(date.getMinutes())}:{addLeadingZero(date.getSeconds())}
        </div>
      </div>
      <div className="break-all whitespace-pre-wrap ml-1 flex">
        <div className="prose flex flex-col">
          <ReactMarkdown children={req.msg} remarkPlugins={[remarkGfm, [remarkGithub, {
            repository: "https://github.com/a/b",
            mentionStrong: false,
            buildUrl(values) {
              if (values.type == "commit" || values.type == "compare") return false
              if (values.type == "issue") {
                if (values.user != "a" || values.project != "b") return false
                return "/chats/" + values.no
              }
              if (values.type == "mention") {
                return "/users/" + encodeURIComponent(values.user)
              }
            }
          } as RemarkGithubOptions]]} components={{
            a: ({node, href, children, ...props}) => (
              <MessageLink link={href!} children={children} />
            ),
            code({node, inline, className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '')
              console.log(!inline && match)
              return !inline && match ? (
                <SyntaxHighlighter
                  children={String(children).replace(/\n$/, '')}
                  language={match[1]}
                  wrapLongLines
                  style={materialLight}
                  showLineNumbers
                  {...props as any}
                />
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }
          }} />
        </div>
        {!showTitle && (
          <div draggable onDragStart={dragStartHandler} className="m-auto mr-4 hidden group-hover:block text-gray-500 text-xs font-normal">
            {addLeadingZero(date.getMonth() + 1)}-{addLeadingZero(date.getDate())}&nbsp;
            {addLeadingZero(date.getHours())}:{addLeadingZero(date.getMinutes())}:{addLeadingZero(date.getSeconds())}
          </div>
        )}
      </div>
    </li>
  )
})

export default function Chat() {
  const [msgBody, setMsgBody] = useState("")
  const params = useParams()
  const username = useSelector(state => state.username.value)
  const { values: chats } = useChatList()
  const chatRaw = Number(params.id)
  const chat = Number.isNaN(chatRaw) || !chats.includes(chatRaw) ? null : chatRaw
  const messageHistory = useSelector(state => state.message.value)
  const messages = chat == null || messageHistory[chat] == null ? [] : messageHistory[chat]
  const { ready, successAlert, errorAlert } = useNetwork()
  const ref = useRef<HTMLUListElement>(null)
  const fetcher = useFetcher()
  const session = useSelector(state => state.chat.session)
  const result = useChatActionData()
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
  useEffect(() => {
    if (result == undefined) return
    if (result.ok) {
      successAlert("The operation was successfully completed. ")
    } else {
      errorAlert("The operation is failed")
    }
  }, [result])
  const messagesShow = messages.filter(a => a.req.session == session)
  return (
    <>
      <div className="flex flex-col overflow-hidden p-2 h-full flex-1">
        <ul ref={ref} className="flex flex-col m-0 p-0 overflow-auto no-scrollbar flex-1">
          {messagesShow
            .reduce<[RequestWithTime | null, RequestWithTime][]>((a, b) => (
              [...a, [a.flat().at(-1)!, b]]
            ), [[null, null]] as unknown as [RequestWithTime | null, RequestWithTime][])
            .slice(1)
            .map(([prevMsg, nowMsg]) => (
              <MessageComponent prevMsg={prevMsg} nowMsg={nowMsg} key={nowMsg.time} />
            ))
          }
        </ul>
        <div className="mt-auto mb-2 mx-1 flex flex-col relative">
          <fetcher.Form method="post" onSubmit={() => {
            setMsgBody("")
          }}>
            <div className="flex flex-col rounded-lg overflow-hidden">
              <TextField 
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
            </div>
            <input type="hidden" name="session" value={session ?? ""} />
            <div className="absolute bottom-0 right-0">
              <Button disabled={!ready || chat == null} type="submit">send</Button>
            </div>
          </fetcher.Form>
        </div>
      </div>
      <Toolbar />
    </>
  )
}