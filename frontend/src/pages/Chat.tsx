import { useEffect, useState, useRef, useCallback, DragEvent, memo } from "react"
import { useParams, useFetcher } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkGithub, { Options as RemarkGithubOptions } from "remark-github"
// import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter"
import classNames from "classnames"
// import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import formatDistance from "date-fns/formatDistance"

import { RequestType, Request, RequestWithTime, MESSAGE_MIME_TYPE } from "../config"
import { MessageAvatar, MessageLink } from "../Messages"
import useStore from "../store"
import { stringToNumber, useChatList, useNetwork } from "../tools"
import { useChatActionData, wait } from "../loaders"


const MessageComponent = memo(function MessageComponent({ prevMsg, nowMsg }: {
  prevMsg: RequestWithTime | null,
  nowMsg: RequestWithTime
}) {
  const prevReq = prevMsg?.req
  const req = nowMsg.req
  const date = new Date(nowMsg.time)
  const dragStartHandler = useCallback((ev: DragEvent<HTMLDivElement>) => {
    ev.dataTransfer.dropEffect = "copy"
    ev.dataTransfer.setData(MESSAGE_MIME_TYPE, JSON.stringify({
      msg: req.msg
    }))
    ev.dataTransfer.setData("text/plain", `${req.usrname}: ${req.msg}`)
  }, [req.msg])
  const selfUsername = useStore(state => state.username)
  return (
    <li key={nowMsg.time} className={classNames("chat", req.usrname == selfUsername ? "chat-end" : "chat-start")}>
      <MessageAvatar name={req.usrname} />
      <div className={classNames("chat-header flex space-x-2", req.usrname == selfUsername ? "flex-row-reverse" : "flex-row")}>
        {req.usrname}
        <div className="text-xs opacity-50 mx-2 my-auto" draggable onDragStart={dragStartHandler}>
          {formatDistance(date, new Date)}
        </div>
      </div>
      <div className={classNames("prose prose-headings:text-inherit chat-bubble", [
        "chat-bubble-primary",
        "chat-bubble-secondary",
        "chat-bubble-accent",
        "chat-bubble-info",
        "chat-bubble-success",
        "chat-bubble-warning",
        "chat-bubble-error"
      ][stringToNumber(req.usrname) % 6])}>
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
          // code({node, inline, className, children, ...props}) {
          //   const match = /language-(\w+)/.exec(className || '')
          //   console.log(!inline && match)
          //   return !inline && match ? (
          //     <SyntaxHighlighter
          //       children={String(children).replace(/\n$/, '')}
          //       language={match[1]}
          //       wrapLongLines
          //       style={materialLight}
          //       showLineNumbers
          //       {...props as any}
          //     />
          //   ) : (
          //     <code className={className} {...props}>
          //       {children}
          //     </code>
          //   )
          // }
        }} />
      </div>
    </li>
  )
})

export default function Chat() {
  const [msgBody, setMsgBody] = useState("")
  const params = useParams()
  const username = useStore(state => state.username)
  const { values: chats } = useChatList()
  const chatRaw = Number(params.id)
  const chat = Number.isNaN(chatRaw) || !chats.includes(chatRaw) ? null : chatRaw
  const messageHistory = useStore(state => state.messages)
  const messages = chat == null || messageHistory[chat] == null ? [] : messageHistory[chat]
  const { ready, successAlert, errorAlert } = useNetwork()
  const ref = useRef<HTMLUListElement>(null)
  const fetcher = useFetcher()
  const session = useStore(state => state.session)
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
        <ul ref={ref} className="flex flex-col m-0 p-0 overflow-auto no-scrollbar flex-1 space-y-1">
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
        <fetcher.Form method="post" className="mt-auto mb-2 mx-1 flex relative" onSubmit={ev => {
          setMsgBody("")
        }}>
          <input
            type="text"
            placeholder="Message"
            className="input input-lg w-full"
            name="msg"
            disabled={!ready || chat == null}
            autoComplete="off"
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
          <input type="hidden" name="session" value={session ?? ""} />
          <div className="absolute bottom-0 right-0">
            <button className={classNames("btn btn-ghost", {
              "btn-disabled": !ready || chat == null
            })} type="submit">send</button>
          </div>
        </fetcher.Form>
      </div>
    </>
  )
}