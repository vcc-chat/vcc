import { memo } from "react"
import { useMatches, useNavigate, useParams, Outlet } from "react-router-dom"

import { useSelector } from "../store"
import {
  SettingsRoot,
  SettingsAccordion
} from "../Settings"

export default memo(function Settings(props: {}) {
  const chat = useSelector(state => state.chat.value)
  // const [showSettings, setShowSettings] = useState<string | null>("info")
  const matches = useMatches()
  const showSettings = matches[3].pathname.split("/").at(-1)!
  const navigate = useNavigate()
  const setShowSettings = (item: string | undefined) => {
    console.log({ item }, `/chats/${chat}/settings/${item ?? "null"}`)
    navigate(`../${item ?? "null"}`, {
      replace: true,
      relative: "path"
    })
  }

  return (
    <SettingsRoot>
      <SettingsAccordion title="Basic Information" showID="info" subtitle="Name, ID and invite link" index={showSettings} setIndex={setShowSettings} />
      <SettingsAccordion title="Joined users" showID="users" subtitle="List users and manage permission" index={showSettings} setIndex={setShowSettings} />
      <SettingsAccordion title="Actions" showID="actions" subtitle="Rename chat" index={showSettings} setIndex={setShowSettings} />
    </SettingsRoot>
  )
})
