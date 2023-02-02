import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useChatList, useNetwork, useTitle } from "../tools"
import useStore from "../store"

export default function CreateChat() {
  const { values: chats, names: chatNames, parentChats, refresh } = useChatList()
  const { makeRequest, successAlert, errorAlert } = useNetwork()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const addSession = useStore(state => state.addSession)

  const [chatName, setChatName] = useState("")
  const [parentChat, setParentChat] = useState(-1)

  const isParentChat = useMemo(() => (
    Object.keys(parentChats).includes(String(parentChat)) || parentChat == -1
  ), [parentChats, parentChat])

  useTitle(isParentChat ? "Create Chat" : "Create Session")
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold">{t("Create your ")}{t(isParentChat ? "chat" : "session")}</h1>
          <p className="py-6">{t(isParentChat ? "Create a chat and talk with your friends in it. " : "Create a session and talk on a topic. ")}</p>
        </div>
        <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          <div className="card-body">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("Name")}</span>
              </label>
              <input type="text" placeholder={t("Name")!} className="input input-bordered" value={chatName} onChange={ev => {
                setChatName(ev.target.value)
              }} />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("Parent Chat")}</span>
              </label>
              <select className="select w-full max-w-xs" value={parentChat == -1 ? t("None")! : `${parentChat} ${chatNames[chats.indexOf(parentChat)]}`} onChange={ev => {
                setParentChat(ev.target.value == t("None") ? -1 : parseInt(ev.target.value.split(" ")[0]))
              }}>
                <option>{t("None")}</option>
                {chats.map((chat, index) => {
                  const name = chatNames[index]
                  return (
                    <option key={chat}>
                      {chat} {name}
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="form-control mt-6">
              <button className="btn btn-primary" onClick={async () => {
                if (chatName === "") return
                if (isParentChat) {
                  const { uid } = await makeRequest({
                    type: "chat_create",
                    usrname: chatName,
                    uid: parentChat
                  })
                  if (uid) {
                    successAlert(t("You have created the chat successfully. "))
                    refresh()
                    navigate(`/chats/${uid}`)
                  } else {
                    errorAlert(`You haven't created the chat successfully. `)
                  }
                } else {
                  const { uid } = await makeRequest({
                    type: "session_join",
                    uid: parentChat,
                    msg: chatName
                  })
                  if (uid) {
                    successAlert(t("You have created/joined the session successfully. "))
                    addSession(parentChat, chatName)
                    navigate(`/chats/${parentChat}`)
                  } else {
                    errorAlert(t("Permission denied. "))
                  }
                }
              }}>{t("Create")}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}