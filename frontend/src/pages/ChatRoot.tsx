import { useEffect } from "preact/hooks"
import { useParams, useNavigate, Outlet } from "react-router-dom"

import { MainLayout } from "../Sidebar"
import useStore from "../store"
import { useChatList } from "../tools"

export default function Chat(props: {}) {
  const params = useParams()
  const { values: chats, names: chatNames } = useChatList()
  const chatRaw = Number(params.id)
  const chat = Number.isNaN(chatRaw) || !chats.includes(chatRaw) ? null : chatRaw
  const chatNow = useStore(state => state.chat)
  const navigate = useNavigate()
  const changeValue = useStore(state => state.changeChat)
  const changeName = useStore(state => state.changeChatName)

  useEffect(() => {
    if (chatNow != chat) {
      changeValue(chat)
      changeName(chat == null ? "" : chatNames[chats.indexOf(chat)])
    }
  }, [chat, chatNow])

  useEffect(() => {
    if (chat == null && chats.length) {
      navigate(`/chats/${chats[0]}`)
    }
  }, [chat, chats])
  return (
    <>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </>
  )
}