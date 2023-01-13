import { useState, memo, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { RequestType } from "../config"

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

  useEffect(() => {
    if (chatName == null) return
    setRenameValue(chatName)
  }, [chatName])

  useEffect(() => {
    setPublic(publicRaw)
  }, [publicRaw])

  async function rename() {
    const { uid } = await makeRequest({
      type: RequestType.CTL_RNAME,
      uid: chat!,
      msg: renameValue
    })
    if (uid) {
      successAlert("Chat has renamed.")
    } else {
      errorAlert("Permission denied.")
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
      type: RequestType.CTL_MCPER,
      uid: chat!,
      usrname: "public",
      msg: publicValue as any
    })
    if (uid) {
      successAlert(`The chat has been ${publicValue ? "public" : "private"}.`)
    } else {
      errorAlert("Permission denied.")
    }
    queryClient.invalidateQueries(["chat-public", chat])
  }

  return (
    <div className="flex form-control space-y-4">
      <label className="label">
        <span className="label-text">Chat name</span>
      </label>
      <input type="text" placeholder="Rename" className="input mr-auto" value={renameValue} onChange={ev => {
        setRenameValue(ev.target.value)
      }} />
      {/* <FormControlLabel className="ml-4" label="Public" control={<Switch checked={publicValue} onChange={ev => setPublic(ev.target.checked)} />} /> */}
      <label className="label cursor-pointer mr-auto">
        <span className="label-text mr-4">Public</span> 
        <input type="checkbox" className="toggle" checked={publicValue} onChange={ev => setPublic(ev.target.checked)} />
      </label>
      <button className="btn mr-auto" disabled={publicRaw == publicValue && renameValue == chatName} onClick={() => {
        if (renameValue != chatName) {
          rename()
        }
        if (publicRaw != publicValue) {
          modifyPublic()
        }
      }}>Change</button>
    </div>
  )
})
