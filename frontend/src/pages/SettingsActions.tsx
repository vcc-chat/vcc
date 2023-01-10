import { useState, memo, useEffect } from "react"
import styled from "@emotion/styled"
import {
  TextField,
  FormControlLabel,
  Switch
} from "@mui/material"
import { useQueryClient } from "@tanstack/react-query"

import { RequestType } from "../config"

import { useSelector } from "../store"
import { useChatList, useNetwork } from "../tools"
import {
  SettingsFormItem,
  SettingsButton
} from "../Settings"
import { useSettingsActionsLoaderData } from "../loaders"

const SwitchLabel = styled(FormControlLabel)`
  margin-left: 1em;
`

export default memo(function SettingsActions(props: {}) {
  const chat = useSelector(state => state.chat.value)
  const chatName = useSelector(state => state.chat.name)
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
    <SettingsFormItem>
      <TextField label="Rename" value={renameValue} onChange={ev => {
        setRenameValue(ev.target.value)
      }} />
      <SwitchLabel label="Public" control={<Switch checked={publicValue} onChange={ev => setPublic(ev.target.checked)} />} />
      <SettingsButton disabled={publicRaw == publicValue && renameValue == chatName} onClick={() => {
        if (renameValue != chatName) {
          rename()
        }
        if (publicRaw != publicValue) {
          modifyPublic()
        }
      }}>Change</SettingsButton>
    </SettingsFormItem>
  )
})
