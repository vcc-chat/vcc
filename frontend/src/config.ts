export type RequestType =
  | "message"
  | "login"
  | "chat_create"
  | "chat_join"
  | "chat_quit"
  | "chat_get_name"
  | "chat_list"
  | "register"
  | "token_login"
  | "chat_get_users"
  | "chat_rename"
  | "chat_kick"
  | "chat_get_all_permission"
  | "chat_modify_user_permission"
  | "chat_generate_invite"
  | "chat_check_invite"
  | "chat_invite"
  | "chat_get_permission"
  | "chat_modify_permission"
  | "session_join"
  | "is_online"
  | "file_upload"
  | "file_download"
  | "request_oauth"
  | "login_oauth"
  | "record_query"
  | "chat_get_nickname"
  | "chat_change_nickname"
  | "push_get_vapid_public_key"
  | "push_register"

export type NewMessage = {
  username: string
  msg_type: string
  payload: any
  session: string
  chat: number
  uid: number
  id: string
}

export type Message = {
  chat: number
  username: string
  msg: string
  session?: string
  user_id?: number
  id?: string
}

export type SendMessage = {
  chat: number
  session: string | null
  msg: string
}

export interface MessageWithTime {
  time: number
  req: Message
}

export const MESSAGE_MIME_TYPE = "application/x-web-vcc.message+json"
