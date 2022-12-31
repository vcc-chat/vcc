
import { useState } from "react"
import styled from "styled-components"
import SpeedDial from "@mui/material/SpeedDial"
import SpeedDialIcon from "@mui/material/SpeedDialIcon"
import SpeedDialAction from "@mui/material/SpeedDialAction"
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined"
import GroupRemoveOutlinedIcon from "@mui/icons-material/GroupRemoveOutlined"
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"

import { Request, RequestType } from "./config"
import { useDispatch, useSelector } from "./store"
import { changeValue as changeChat, add as addChat, remove as removeChat } from "./state/chat"
import { LoginType } from "./state/login"
import { useNetwork } from "./hooks"

const ToolbarRoot = styled(SpeedDial)`
  position: fixed;
  bottom: 64px;
  right: 16px;
`

export function ToolbarDialog({ afterJoin, typeNumber, typeString, open, setOpen }: {
  afterJoin: (arg0: number) => void,
  typeNumber: RequestType,
  typeString: string,
  open: boolean,
  setOpen: (arg0: boolean) => void
}) {
  const [dialogValue, setDialogValue] = useState("")
  const title = typeString[0].toUpperCase() + typeString.slice(1)
  const username = useSelector(state => state.username.value)
  const { sendJsonMessage } = useNetwork()
  return (
    <Dialog open={open}>
      <DialogTitle>{title} chat</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter the chat number you want to {typeString}.
        </DialogContentText>
        <TextField 
          autoFocus 
          label="Chat id" 
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }} 
          margin="dense" 
          value={dialogValue} 
          onChange={ev => setDialogValue(ev.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>close</Button>
        <Button onClick={() => {
          let chat: number
          try {
            chat = parseInt(dialogValue)
          } catch (e) {
            return
          }
          if (chat === null) return
          sendJsonMessage({
            uid: chat,
            type: typeNumber
          })
          setOpen(false)
          afterJoin(chat)
        }}>{typeString}</Button>
      </DialogActions>
    </Dialog>
  )
}

export function CreateChatDialog({ open, setOpen }: {
  open: boolean,
  setOpen: (arg0: boolean) => void
}) {
  const [chatName, setChatName] = useState("")
  const { sendJsonMessage, makeRequest, successAlert, errorAlert } = useNetwork()
  return (
    <Dialog open={open}>
      <DialogTitle>Create chat</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter the name of the chat you want to create.
        </DialogContentText>
        <TextField 
          autoFocus 
          label="Chat name" 
          margin="dense" 
          value={chatName} 
          onChange={ev => setChatName(ev.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>close</Button>
        <Button onClick={async () => {
          if (chatName === "") return
          const { uid } = await makeRequest({
            type: RequestType.CTL_NEWSE,
            usrname: chatName
          })
          if (uid) {
            successAlert("You have created the chat successfully. ")
            sendJsonMessage({
              type: RequestType.CTL_LJOIN
            })
          } else {
            errorAlert("Unexpected error: You haven't created the chat successfully. ")
          }
          setOpen(false)
        }}>create</Button>
      </DialogActions>
    </Dialog>
  )
}


export function Toolbar(props: {}) {
  const dispatch = useDispatch()
  const { sendJsonMessage, makeRequest, successAlert, errorAlert } = useNetwork()
  const chat = useSelector(state => state.chat.value)
  const chats = useSelector(state => state.chat.values)
  const loginStatus = useSelector(state => state.login.type)
  return (
    <>
      <ToolbarRoot ariaLabel="toolbar" icon={<SpeedDialIcon />} hidden={loginStatus != LoginType.LOGIN_SUCCESS || chat == null}>
        <SpeedDialAction icon={<GroupRemoveOutlinedIcon />} tooltipTitle="quit chat" onClick={async () => {
          if (chat == null) return
          dispatch(removeChat(chat))
          if (chats.length) {
            dispatch(changeChat(chats[0]))
          } else {
            dispatch(changeChat(null))
          }
          const { uid } = await makeRequest({
            uid: chat,
            type: RequestType.CTL_QUITS
          })
          if (uid) {
            successAlert("You have quit the chat successfully. ")
          } else {
            errorAlert("Unexpected error: You haven't quit the chat successfully. ")
          }
          sendJsonMessage({
            type: RequestType.CTL_LJOIN
          })
        }} />
      </ToolbarRoot>
    </>
  )
}