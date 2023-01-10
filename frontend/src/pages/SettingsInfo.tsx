import { memo } from "react"
import { Link } from "react-router-dom"

import { useSelector } from "../store"
import { useSettingsInfoLoaderData } from "../loaders"

export default memo(function SettingsInfo(props: {}) {
  const chat = useSelector(state => state.chat.value)
  const chatName = useSelector(state => state.chat.name)

  const { inviteLink } = useSettingsInfoLoaderData()

  return (
    <>
      <div className="mb-2 text-lg">Name: {chatName}</div>
      <div className="mb-2 text-lg">ID: {chat}</div>
      {inviteLink != null && (
        <div className="mb-2 text-lg">Invite Link: 
          <Link className="text-gray-500 hover:text-gray-700 break-all" to={inviteLink}>{location.origin}{inviteLink}</Link>
        </div>
      )}
    </>
  )
})
