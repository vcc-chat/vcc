import { useEffect, createContext, useContext } from "react"
import { useNavigate } from "react-router-dom"
import localforage from "localforage"

import { useDispatch, useSelector } from "./store"
import { reset, success, LoginType } from "./state/login"
import { change as changeUsername } from "./state/username"
import { RequestType, Request } from "./config"

export const NetworkContext = createContext<{
  sendJsonMessage: ((arg0: Request) => void) | null,
  ready: boolean,
  makeRequest: ((arg0: Request) => Promise<Request>) | null
}>({
  sendJsonMessage: null, 
  ready: false, 
  makeRequest: null 
})

export function useNetwork() {
  const { sendJsonMessage, ready, makeRequest } = useContext(NetworkContext)!
  return {
    sendJsonMessage: sendJsonMessage!,
    ready,
    makeRequest: makeRequest!
  }
}

export function useAuth(jumpToLogin: boolean = true) {
  const { makeRequest } = useNetwork()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const loginStatus = useSelector(state => state.login.type)

  useEffect(() => {
    (async () => {
      const token = await localforage.getItem("token")
      if (typeof token == "string") {
        const req = await makeRequest({
          type: RequestType.CTL_TOKEN,
          uid: 0,
          usrname: "",
          msg: token
        })
        if (req.uid != null) {
          dispatch(changeUsername(req.usrname))
          dispatch(success())
        } else {
          localforage.removeItem("token")
          dispatch(reset())
        }
      } else {
        dispatch(reset())
      }
    })()
  }, [])

  useEffect(() => {
    if (jumpToLogin && loginStatus == LoginType.NOT_LOGIN) {
      navigate("/login")
    }
  }, [loginStatus])
}

