import { createContext, useContext } from "react"
import { RequestType, Request } from "./config"

export const NetworkContext = createContext<{
  sendJsonMessage: ((arg0: Request) => void) | null,
  ready: boolean,
  makeRequest: ((arg0: Request) => Promise<Request>) | null,
  successAlert: ((msg: string) => void) | null,
  errorAlert: ((msg: string) => void) | null
}>({
  sendJsonMessage: null, 
  ready: false, 
  makeRequest: null,
  successAlert: null,
  errorAlert: null
})

export function useNetwork() {
  const { sendJsonMessage: sendJsonMessageRaw, ready, makeRequest: makeRequestRaw, successAlert, errorAlert } = useContext(NetworkContext)!
  function makeRequest(request: {
    type: RequestType,
    uid?: number,
    usrname?: string,
    msg?: string
  }) {
    return makeRequestRaw!({
      type: request.type,
      uid: request.uid ?? 0,
      usrname: request.usrname ?? "",
      msg: request.msg ?? ""
    })
  }
  function sendJsonMessage(request: {
    type: RequestType,
    uid?: number,
    usrname?: string,
    msg?: string
  }) {
    return sendJsonMessageRaw!({
      type: request.type,
      uid: request.uid ?? 0,
      usrname: request.usrname ?? "",
      msg: request.msg ?? ""
    })
  }
  return {
    sendJsonMessage,
    ready,
    makeRequest,
    successAlert: successAlert!,
    errorAlert: errorAlert!
  }
}

