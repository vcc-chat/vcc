import { useEffect } from "react"
import { useParams, useNavigate, Outlet } from "react-router-dom"

import { MainLayout } from "../Sidebar"
import { useDispatch, useSelector } from "../store"
import { changeName, changeValue } from "../state/chat"
import { useChatList } from "../tools"

export default function Chat(props: {}) {
  const params = useParams()
  const { values: chats, names: chatNames } = useChatList()
  const chatRaw = Number(params.id)
  const chat = Number.isNaN(chatRaw) || !chats.includes(chatRaw) ? null : chatRaw
  const chatNow = useSelector(state => state.chat.value)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    if (chatNow != chat) {
      dispatch(changeValue(chat))
      dispatch(changeName(chat == null ? "" : chatNames[chats.indexOf(chat)]))
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