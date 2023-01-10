import { memo } from "react"
import { useMatches, useNavigate, useParams, Outlet } from "react-router-dom"

import { useSelector } from "../store"
import {
  SettingsAccordion
} from "../Settings"

export default memo(function Settings(props: {}) {
  const matches = useMatches()
  const showSettings = matches[3].pathname.split("/").at(-1)!
  const navigate = useNavigate()
  const setShowSettings = (item: string | undefined) => {
    navigate(`../${item ?? "null"}`, {
      replace: true,
      relative: "path"
    })
  }

  return (
    <div className="p-8 flex flex-col">
      <SettingsAccordion title="Basic Information" showID="info" subtitle="Name, ID and invite link" index={showSettings} setIndex={setShowSettings} />
      <SettingsAccordion title="Actions" showID="actions" subtitle="Rename chat" index={showSettings} setIndex={setShowSettings} />
    </div>
  )
})
