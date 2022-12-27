export const WEBSOCKET_PORT = 7000

export const enum RequestType {
  MSG_SEND = "message", 
  CTL_LOGIN = "login",
  CTL_NEWSE = "chat_create",
  CTL_JOINS = "chat_join",
  CTL_QUITS = "chat_quit",
  CTL_SNAME = "chat_get_name",
  CTL_LJOIN = "chat_list_somebody_joined",
  CTL_REGIS = "register",
  CTL_TOKEN = "token_login"
}

export type Request = {
  type: RequestType
  uid: number
  usrname: string
  msg: string
}

export interface RequestWithTime {
  time: Date
  req: Request
}

export const WEBSOCKET_USE_PATH = import.meta.env.PROD
