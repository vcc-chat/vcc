import { memo, type TargetedEvent } from "preact/compat"
import { useState, useEffect } from "preact/hooks"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import useStore from "../store"
import { useChatList, useAlert } from "../tools"
import { useSettingsActionsLoaderData } from "../loaders"
import rpc from "../network"

export const Component = memo(function SettingsActions() {
  const chat = useStore(state => state.chat)
  const chatName = useStore(state => state.chatName)
  const { refresh: refreshChats } = useChatList()
  const { successAlert, errorAlert } = useAlert()
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
    if (await rpc.chat.rename(chat!, renameValue)) {
      successAlert(t("Chat has renamed."))
    } else {
      errorAlert(t("Permission denied."))
    }
    refreshChats()
  }
  if (chat == null || chatName == null) {
    return <div />
  }

  async function modifyPublic() {
    if (await rpc.chat.modifyPermission(chat!, "public", publicValue)) {
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
      <input
        type="text"
        placeholder={t("Rename") ?? ""}
        className="input mr-auto"
        value={renameValue}
        onInput={(ev: TargetedEvent<HTMLInputElement, Event>) => {
          setRenameValue(ev.currentTarget.value)
        }}
      />
      {/* <FormControlLabel className="ml-4" label="Public" control={<Switch checked={publicValue} onChange={ev => setPublic(ev.target.checked)} />} /> */}
      <label className="label cursor-pointer mr-auto">
        <span className="label-text mr-4">{t("Public")}</span>
        <input
          type="checkbox"
          className="toggle"
          checked={publicValue}
          onClick={(ev: TargetedEvent<HTMLInputElement, Event>) => setPublic(ev.currentTarget.checked)}
        />
      </label>
      <button
        className="btn mr-auto"
        disabled={publicRaw == publicValue && renameValue == chatName}
        onClick={() => {
          if (renameValue != chatName) {
            rename()
          }
          if (publicRaw != publicValue) {
            modifyPublic()
          }
        }}
      >
        {t("Apply")}
      </button>
    </div>
  )
})
