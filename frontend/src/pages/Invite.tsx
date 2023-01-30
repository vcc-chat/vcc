import { useNavigate, useLoaderData } from "react-router-dom"
import { useTranslation } from "react-i18next"


import { useChatList, useNetwork } from "../tools"
import useStore from "../store"
import classNames from "classnames"


export default function Invite(props: {}) {
  const { makeRequest, ready, successAlert, errorAlert } = useNetwork()
  const { chat, token } = useLoaderData() as { chat: number, token: string }
  const { refresh: refreshChats, values: chats } = useChatList()
  const navigate = useNavigate()
  const changeValue = useStore(state => state.changeChat)
  const { t } = useTranslation()
  return (
    <>
      {ready && (
        <>
          <div className={classNames("hero min-h-screen bg-base-200", {
            "hidden": !chats.includes(chat)
          })}>
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h1 className="text-5xl font-bold">{t("Join chat")}</h1>
                <p className="py-6">{t("You have already joined chat")}{chat}.</p>
                <button className="btn btn-primary" onClick={async () => {
                  navigate("/")
                }}>{t("go back to home")}</button>
              </div>
            </div>
          </div>
          <div className={classNames("hero min-h-screen bg-base-200", {
            "hidden": chats.includes(chat)
          })}>
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h1 className="text-5xl font-bold">{t("Join chat")}</h1>
                <p className="py-6">{t("Would you like to join chat ")}{chat}?</p>
                <button className="btn btn-primary" onClick={async () => {
                  const { uid } = await makeRequest({
                    type: "chat_invite",
                    msg: token
                  })
                  console.log(uid)
                  if (uid) {
                    successAlert(t("You have joined the chat successfully. "))
                    changeValue(chat)
                    refreshChats()
                  } else {
                    errorAlert(t("Unexpected error occurred. "))
                  }
                  navigate("/")
                }}>{t("join")}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
