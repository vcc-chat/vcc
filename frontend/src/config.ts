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
  CTL_TOKEN = "token_login",
  CTL_USERS = "chat_get_users",
  CTL_RNAME = "chat_rename",
  CTL_KICK = "chat_kick",
  CTL_GPERM = "chat_get_all_permission",
  CTL_MPERM = "chat_modify_user_permission",
  CTL_GINVI = "chat_generate_invite",
  CTL_CINVI = "chat_check_invite",
  CTL_INVIT = "chat_invite"
}

export type Request = {
  type: RequestType
  uid: number
  usrname: string
  msg: string
}

export interface RequestWithTime {
  time: number
  req: Request
}

export const WEBSOCKET_USE_PATH = import.meta.env.PROD
