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
  CTL_INVIT = "chat_invite",
  CTL_GCPER = "chat_get_permission",
  CTL_MCPER = "chat_modify_permission",
  CTL_JSESS = "session_join",
  CTL_ISONL = "is_online",
  CTL_UPLOA = "file_upload",
  CTL_DOWNL = "file_download",
}

export type Request = {
  type: RequestType
  uid: number
  usrname: string
  msg: string
  uuid?: string
  session?: string
}

export interface RequestWithTime {
  time: number
  req: Request
}

export const MESSAGE_MIME_TYPE = "application/x-web-vcc.message+json"
