export type RequestType = 
  | "message" | "login" | "chat_create" | "chat_join" 
  | "chat_quit" | "chat_get_name" | "chat_list" 
  | "register" | "token_login" | "chat_get_users" 
  | "chat_rename" |  "chat_kick" | "chat_get_all_permission" 
  | "chat_modify_user_permission" | "chat_generate_invite" 
  | "chat_check_invite" | "chat_invite" | "chat_get_permission" 
  | "chat_modify_permission" | "session_join" | "is_online" 
  | "file_upload" | "file_download" | "request_oauth"
  | "login_oauth" | "record_query"

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
