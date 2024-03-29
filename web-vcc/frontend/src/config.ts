export type NewMessage = {
  username: string | null
  type: string
  payload: any
  session: string | null
  chat: number
  uid: number
  id: string
}

export type SendMessage = {
  chat: number
  session: string | null
  msg: string
}

export interface NewMessageWithTime {
  time: number
  req: NewMessage
}

export const MESSAGE_MIME_TYPE = "application/x-web-vcc.message+json"
