import { useState, memo, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import useStore from "../store"
import { useChatList, useNetwork } from "../tools"
import { useSettingsActionsLoaderData } from "../loaders"

export default memo(function SettingsActions(props: {}) {
  const chat = useStore(state => state.chat)
  const chatName = useStore(state => state.chatName)
  const { refresh: refreshChats } = useChatList()
  const { makeRequest, successAlert, errorAlert } = useNetwork()
  const [renameValue, setRenameValue] = useState("")
  const { public_: publicRaw } = useSettingsActionsLoaderData()
  const [publicValue, setPublic] = useState(false)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  useEffect(() => {
    if (chatName == null) return
    setRenameValue(chatName)
  }, [chatName])

  useEffect(() => {
    setPublic(publicRaw)
  }, [publicRaw])

  async function rename() {
    const { uid } = await makeRequest({
      type: "chat_rename",
      uid: chat!,
      msg: renameValue
    })
    if (uid) {
      successAlert(t("Chat has renamed."))
    } else {
      errorAlert(t("Permission denied."))
    }
    refreshChats()
  }
  if (chat == null || chatName == null) {
    return (
      <div />
    )
  }

  async function modifyPublic() {
    const { uid } = await makeRequest({
      type: "chat_modify_permission",
      uid: chat!,
      usrname: "public",
      msg: publicValue as any
    })
    if (uid) {
      successAlert(t(`The chat has been ${publicValue ? "public" : "private"}.`))
    } else {
      errorAlert(t("Permission denied."))
    }
    queryClient.invalidateQueries(["chat-public", chat])
  }

  return (
    <div className="flex form-control space-y-4">
      <label className="label">
        <span className="label-text">{t("Chat name")}</span>
      </label>
      <input type="text" placeholder={t("Rename") ?? ""} className="input mr-auto" value={renameValue} onChange={ev => {
        setRenameValue(ev.target.value)
      }} />
      {/* <FormControlLabel className="ml-4" label="Public" control={<Switch checked={publicValue} onChange={ev => setPublic(ev.target.checked)} />} /> */}
      <label className="label cursor-pointer mr-auto">
        <span className="label-text mr-4">{t("Public")}</span> 
        <input type="checkbox" className="toggle" checked={publicValue} onChange={ev => setPublic(ev.target.checked)} />
      </label>
      <button className="btn mr-auto" disabled={publicRaw == publicValue && renameValue == chatName} onClick={() => {
        if (renameValue != chatName) {
          rename()
        }
        if (publicRaw != publicValue) {
          modifyPublic()
        }
      }}>{t("Apply")}</button>
    </div>
  )
})
