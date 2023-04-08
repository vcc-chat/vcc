import { useEffect, useState, useRef, useCallback, useId, useReducer, useMemo } from "preact/hooks"
import { useSignal } from "@preact/signals"
import { memo, type TargetedEvent, createPortal } from "preact/compat"
import type { ComponentChildren } from "preact"
import { useParams, useFetcher, Link, useBeforeUnload } from "react-router-dom"
import { useTranslation } from "react-i18next"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkGithub, { Options as RemarkGithubOptions } from "remark-github"
import remarkDirective from "remark-directive"
import remarkDirectiveRehype from "remark-directive-rehype"
// import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter"
import classNames from "classnames"
// import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import { formatDistanceToNow } from "date-fns"
import { zhCN, zhTW, enUS as en } from "date-fns/locale"
import { useQuery } from "@tanstack/react-query"
import FileUploadIcon from "@material-design-icons/svg/outlined/file_upload.svg"
import InfoIcon from "@material-design-icons/svg/outlined/info.svg"
import SendIcon from "@material-design-icons/svg/filled/send.svg"

import { type RequestWithTime, MESSAGE_MIME_TYPE } from "../config"
import { MessageAvatar, MessageLink } from "../components/Messages"
import useStore from "../store"
import { stringToNumber, useChatList, useNetwork, useNickname, useTitle } from "../tools"
import { useChatActionData } from "../loaders"

const NormalMessage = memo(function NormalMessage({ nowMsg }: {
  nowMsg: RequestWithTime
}) {
  const req = nowMsg.req
  const date = new Date(nowMsg.time)
  const markdownToHTML = useMemo(() => useStore.getState().markdownToHTML, [])
  const addMarkdownToHTML = useStore(state => state.addMarkdownToHTML)
  const dragStartHandler = useCallback((ev: DragEvent) => {
    ev.dataTransfer!.dropEffect = "copy"
    ev.dataTransfer!.setData(MESSAGE_MIME_TYPE, JSON.stringify({
      msg: req.msg
    }))
    ev.dataTransfer!.setData("text/plain", `${req.usrname}: ${req.msg}`)
  }, [req.msg])
  const selfUsername = useStore(state => state.username)
  const savedHTML = markdownToHTML[req.msg]
  const markdownChildren = savedHTML === undefined ? req.msg : ""
  const html = savedHTML === undefined ? null : savedHTML
  const { makeRequest } = useNetwork()
  const { t, i18n } = useTranslation()
  const username = useNickname(nowMsg.req.user_id!)
  const savePlugin: any = useCallback(() => {
    return (transformer: any) => {
      if (html) {
        Object.assign(transformer, html)
      } else {
        setTimeout(() => {
          addMarkdownToHTML(req.msg, transformer)
        }, 0)
      }
    }
  }, [html, req.msg, addMarkdownToHTML])
  const [, rerender] = useReducer(a => a + 1, 0)
  useEffect(() => {
    const interval = setInterval(() => {
      rerender(undefined)
    }, 60000)
    return () => clearInterval(interval)
  }, [])
  return (
    <li key={nowMsg.time} className={classNames("chat", req.usrname == selfUsername ? "chat-end" : "chat-start")}>
      <MessageAvatar name={username!} />
      <div className={classNames("chat-header flex space-x-2", req.usrname == selfUsername ? "flex-row-reverse" : "flex-row")}>
        {username!}
        <div className="text-xs opacity-50 mx-2 my-auto" draggable onDragStart={dragStartHandler}>
          {formatDistanceToNow(date, {
            locale: i18n.language == "zh-TW" ? zhTW : (
              i18n.language == "zh-CN" ? zhCN : (
                en
              )
            )
          })}
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
        {(!!markdownChildren || !!html) && <ReactMarkdown
          children={markdownChildren}
          allowedElements={[
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
          ]}
          remarkPlugins={html ? [] : [remarkGfm, remarkDirective, remarkDirectiveRehype, [remarkGithub, {
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
          } as RemarkGithubOptions]]}
          rehypePlugins={[
            savePlugin
          ]}
          components={{
            a: ({ href, children, ...props }: {
              href?: any,
              children: ComponentChildren
            }) => (
              <MessageLink link={href!} children={children} />
            ),
            ["file" as any]: ({ id }: { id: string }) => (
              <Link className="link" to={`/files/${encodeURIComponent(id)}`} replace>{t("Download File")}</Link>
            )
          }}
        />}
      </div>
    </li>
  )
})

function MessageComponent({ nowMsg }: {
  nowMsg: RequestWithTime
}) {
  return nowMsg.req.usrname == "system" ? (
    <div className="flex">
      <div className="alert alert-info mx-auto w-auto">
        <div>
          <InfoIcon />
          <span>{nowMsg.req.msg}</span>
        </div>
      </div>
    </div>
  ) : <NormalMessage nowMsg={nowMsg} />
}

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
                type: "file_upload",
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

(window as any).addMessage = useStore.getState().addMessage

export const Component = memo(function Chat() {
  const msgBody = useSignal("")
  const params = useParams()
  const { values: chats, names: chatNames } = useChatList()
  const chatRaw = Number(params.id)
  const chat = Number.isNaN(chatRaw) || !chats.includes(chatRaw) ? null : chatRaw
  const messageHistory = useStore(state => state.messages)
  const messages = chat == null || messageHistory[chat] == null ? [] : messageHistory[chat]
  const { successAlert, errorAlert } = useNetwork()
  const ref = useRef<HTMLUListElement>(null)
  const fetcher = useFetcher()
  const session = useStore(state => state.session)
  const result = useChatActionData()
  const fileUploadDialogID = useId()
  const { t } = useTranslation()
  const ready = useStore(state => state.ready)
  const changeLastMessageTime = useStore(state => state.changeLastMessageTime)

  useTitle(session ?? chatNames[chats.indexOf(chat!)])

  useEffect(() => {
    if (ref.current == null) return
    ref.current.scrollTo(0, ref.current!.scrollHeight) 
  }, [chat])
  useEffect(() => {
    if (ref.current == null) return
    if (ref.current.scrollHeight - ref.current.clientHeight - ref.current.scrollTop < 150) {
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
  useBeforeUnload(() => {
    changeLastMessageTime()
  })
  return (
    <>
      <FileUploadDialog id={fileUploadDialogID} />
      <div className="flex flex-col overflow-hidden p-2 h-full flex-1">
        <ul ref={ref} className="flex flex-col m-0 p-0 overflow-auto no-scrollbar flex-1 space-y-1 py-2">
          {messagesShow
            .map((nowMsg) => (
              <MessageComponent nowMsg={nowMsg} key={`${nowMsg.time}-${nowMsg.req.usrname}-${nowMsg.req.msg}`} />
            ))
          }
        </ul>
        <fetcher.Form method="post" className="mt-auto mb-2 mx-1 flex relative" onSubmit={() => {
          msgBody.value = ""
        }}>
          <input
            type="text"
            placeholder={t("Message") ?? undefined}
            className="input input-lg w-full"
            name="msg"
            disabled={!ready || chat == null}
            autoComplete="off"
            onInput={(ev: TargetedEvent<HTMLInputElement, Event>) => {
              msgBody.value = ev.currentTarget.value
            }} 
            onKeyDown={(event: KeyboardEvent) => {
              if (event.keyCode == 10 || event.keyCode == 13) {
                if (event.ctrlKey || event.metaKey) {
                  msgBody.value += "\n"
                } else {
                  fetcher.submit(
                    { msg: msgBody.value, session: session ?? "" },
                    { method: "post" }
                  )
                  msgBody.value = ""
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
})