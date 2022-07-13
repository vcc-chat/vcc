export const WEBSOCKET_PORT = 7000

export const VCC_MAGIC = 0x01328e22
export const VCC_MAGIC_RL = 0x01328e36

export const enum RequestType {
  MSG_SEND = 1, 
  MSG_NEW = 2,
  CTL_USRS = 3,
  CTL_LOGIN = 4,
  CTL_NEWSE = 5,
  CTL_SESS = 6,
  CTL_JOINS = 7,
  CTL_UINFO = 8,
  SYS_SCRINC = 9,
  REL_MSG = 10,
  CTL_IALOG = 11,
  REL_NEW = 12,
  SYS_INFO = 13,
  CTL_SENAME = 14,
  CTL_QUITS = 15
}


export type Request = {
  magic: typeof VCC_MAGIC
  type: RequestType
  uid: number
  session: number
  flags: number
  usrname: string
  msg: string
} | {
  magic: typeof VCC_MAGIC_RL
  type: RequestType
  size: number
  uid: number
  session: number
  usrname: string
  visible: string
  msg: string
}

export interface RequestWithTime {
  time: Date
  req: Request
}