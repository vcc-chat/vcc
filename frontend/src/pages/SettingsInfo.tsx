import { memo } from "react"

import { useSelector } from "../store"
import { useSettingsInfoLoaderData } from "../loaders"
import {
  SettingsItemText,
  SettingsLink
} from "../Settings"

export default memo(function SettingsInfo(props: {}) {
  const chat = useSelector(state => state.chat.value)
  const chatName = useSelector(state => state.chat.name)

  const { inviteLink } = useSettingsInfoLoaderData()

  return (
    <>
      <SettingsItemText>Name: {chatName}</SettingsItemText>
      <SettingsItemText>ID: {chat}</SettingsItemText>
      {inviteLink != null && <SettingsItemText>Invite Link: <SettingsLink to={inviteLink}>{location.origin}{inviteLink}</SettingsLink></SettingsItemText>}
    </>
  )
})
