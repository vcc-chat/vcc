import { useNavigate, useLoaderData } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { useChatList, useAlert, useTitle } from "../tools"
import useStore from "../store"
import clsx from "clsx"
import rpc from "../network"

export function Component() {
  const { successAlert, errorAlert } = useAlert()
  const ready = useStore(state => state.ready)
  const { chat, token } = useLoaderData() as { chat: number; token: string }
  const { refresh, values: chats } = useChatList()
  const navigate = useNavigate()
  const { t } = useTranslation()
  useTitle(`Join Chat ${chat}`)
  return (
    <>
      {ready && (
        <>
          <div
            className={clsx("hero min-h-screen bg-base-200", {
              hidden: !chats.includes(chat)
            })}
          >
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h1 className="text-5xl font-bold">{t("Join chat")}</h1>
                <p className="py-6">
                  {t("You have already joined chat")}
                  {chat}.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    navigate("/")
                  }}
                >
                  {t("go back to home")}
                </button>
              </div>
            </div>
          </div>
          <div
            className={clsx("hero min-h-screen bg-base-200", {
              hidden: chats.includes(chat)
            })}
          >
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h1 className="text-5xl font-bold">{t("Join chat")}</h1>
                <p className="py-6">
                  {t("Would you like to join chat ")}
                  {chat}?
                </p>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const chat = await rpc.chat.invite(token)
                    console.log(chat)
                    if (chat) {
                      await refresh()
                      successAlert(t("You have joined the chat successfully. "))
                      navigate(`/chats/${chat}`)
                    } else {
                      errorAlert(t("Oh No! An unexpected error has occurred. "))
                      navigate("/")
                    }
                  }}
                >
                  {t("join")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
