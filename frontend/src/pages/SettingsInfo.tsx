import { memo } from "react"
import { Link } from "react-router-dom"

import useStore from "../store"
import { useSettingsInfoLoaderData } from "../loaders"

export default memo(function SettingsInfo(props: {}) {
  const chat = useStore(state => state.chat)
  const chatName = useStore(state => state.chatName)

  const { inviteLink } = useSettingsInfoLoaderData()

  return (
    <>
      <div className="mb-2 text-lg">Name: {chatName}</div>
      <div className="mb-2 text-lg">ID: {chat}</div>
      {inviteLink != null && (
        <div className="mb-2 text-lg">Invite Link:&nbsp;
          <Link className="link break-all" to={inviteLink}>{location.origin}{inviteLink}</Link>
        </div>
      )}
    </>
  )
})
