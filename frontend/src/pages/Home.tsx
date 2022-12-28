import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

import { useSelector } from "../store"
import { useAuth } from "../hooks"
import { LoginType } from "../state/login"

export default function Home(props: {}) {
  const chats = useSelector(state => state.chat.values)
  const loginStatus = useSelector(state => state.login.type)
  const navigate = useNavigate()
  
  useAuth()

  useEffect(() => {
    if (loginStatus == LoginType.LOGIN_SUCCESS) {
      navigate(`/chats/empty`)
    }
  }, [loginStatus])
  return (
    <></>
  )
}
