import { useEffect, useState, useRef, useCallback, DragEvent, memo, useId, DetailedHTMLProps } from "react"
import { createPortal } from "react-dom"
import { useParams, useFetcher, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkGithub, { Options as RemarkGithubOptions } from "remark-github"
import remarkDirective from "remark-directive"
import remarkDirectiveRehype from "remark-directive-rehype"
// import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter"
import classNames from "classnames"
// import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import formatDistance from "date-fns/formatDistance"
import FileUploadIcon from "@material-design-icons/svg/outlined/file_upload.svg"
import SendIcon from "@material-design-icons/svg/filled/send.svg"

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
  const { t } = useTranslation()
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
        <ReactMarkdown children={req.msg} allowedElements={[
          "a", "blockquote", "br",
          "code", "del", "em",
          "h1", "h2", "h3",
          "h4", "h5", "h6",
          "hr", "img", "input",
          "li", "ol", "p",
          "pre", "table", "tbody",
          "td", "th", "thead",
          "tr", "ul",
          // extensions
          "file"
        ]} remarkPlugins={[remarkGfm, remarkDirective, remarkDirectiveRehype, [remarkGithub, {
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
          ["file" as any]: ({ id }: { id: string }) => (
            <Link className="link" to={`/files/${encodeURIComponent(id)}`} replace>{t("Download File")}</Link>
          )
        }} />
      </div>
    </li>
  )
})

export function FileUploadDialog({ id }: {
  id: string
}) {
  const { makeRequest } = useNetwork()
  const fileInputID = useId()
  const ref = useRef<HTMLInputElement | null>(null)
  const files = ref.current?.files
  const file = files?.[0]
  const fetcher = useFetcher()
  const session = useStore(state => state.session) ?? ""
  const checkboxRef = useRef<HTMLInputElement | null>(null)
  const { t } = useTranslation()
  return createPortal((
    <>
      <input type="checkbox" id={id} className="modal-toggle" ref={checkboxRef} />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("Upload file")}</h3>
          <p className="py-4">{t("Upload a file")}{file ? (` (${t("current file: ")}${file.name})`) : ""}.</p>
          <input className="hidden" type="file" id={fileInputID} ref={ref} />
          <label htmlFor={fileInputID} className="btn">{t("Upload")}</label>
          <div className="modal-action">
            <label htmlFor={id} className="btn btn-ghost">{t("Close")}</label>
            <button className="btn btn-primary" disabled={!files?.length} type="button" onClick={async () => {
              if (!file) return
              const { usrname: id, msg: url } = await makeRequest({
                type: RequestType.CTL_UPLOA,
                msg: file.name
              })
              console.log({ id, url })
              const { ok } = await fetch(url, {
                method: "PUT",
                body: file
              })
              console.log({ ok })
              fetcher.submit({
                session,
                msg: `::file{#${id}}`
              }, {
                method: "post"
              })
              checkboxRef.current!.checked = false
            }}>{t("Upload to server")}</button>
          </div>
        </div>
      </div>
    </>
  ), document.body)
}

export default function Chat() {
  const [msgBody, setMsgBody] = useState("")
  const params = useParams()
  const username = useStore(state => state.username)
  const { values: chats } = useChatList()
  const chatRaw = Number(params.id)
  const chat = Number.isNaN(chatRaw) || !chats.includes(chatRaw) ? null : chatRaw
  const messageHistory = useStore(state => state.messages)
  const messages = chat == null || messageHistory[chat] == null ? [] : messageHistory[chat]
  const { makeRequest, ready, successAlert, errorAlert } = useNetwork()
  const ref = useRef<HTMLUListElement>(null)
  const fetcher = useFetcher()
  const session = useStore(state => state.session)
  const result = useChatActionData()
  const fileUploadDialogID = useId()
  const { t } = useTranslation()
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
      successAlert(t("The operation was successfully completed. "))
    } else {
      errorAlert(t("The operation is failed"))
    }
  }, [result])
  const messagesShow = messages.filter(a => a.req.session == session)
  return (
    <>
      <FileUploadDialog id={fileUploadDialogID} />
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
            placeholder={t("Message") ?? undefined}
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
          <div className="btn-group absolute bottom-0 right-0">
            <label className={classNames("btn btn-ghost btn-square", {
              "btn-disabled": chat == null || !ready
            })} htmlFor={fileUploadDialogID}>
              <FileUploadIcon />
            </label>
            <button className="btn btn-ghost btn-square" disabled={chat == null || !ready} type="submit">
              <SendIcon />
            </button>
          </div>
        </fetcher.Form>
      </div>
    </>
  )
}