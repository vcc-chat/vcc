
import { useState } from "react"
import styled from "styled-components"
import SpeedDial from '@mui/material/SpeedDial'
import SpeedDialIcon from '@mui/material/SpeedDialIcon'
import SpeedDialAction from '@mui/material/SpeedDialAction'
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined'
import GroupRemoveOutlinedIcon from '@mui/icons-material/GroupRemoveOutlined'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from "@mui/material/TextField"
import Button from '@mui/material/Button'

import { Request, RequestType } from "./config"
import { useDispatch, useSelector } from "./store"
import { changeValue as changeChat, add as addChat, remove as removeChat } from "./state/chat"

const ToolbarRoot = styled(SpeedDial)`
  position: fixed;
  bottom: 64px;
  right: 16px;
`

function ToolbarDialog({ afterJoin, sendJsonMessage, typeNumber, typeString, open, setOpen }: {
  afterJoin: (arg0: number) => void,
  sendJsonMessage: (arg0: Request) => void,
  typeNumber: RequestType,
  typeString: string,
  open: boolean,
  setOpen: (arg0: boolean) => void
}) {
  const [dialogValue, setDialogValue] = useState("")
  const title = typeString[0].toUpperCase() + typeString.slice(1)
  const username = useSelector(state => state.username.value)
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
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} 
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
            type: typeNumber,
            usrname: username,
            msg: ""
          })
          setOpen(false)
          afterJoin(chat)
        }}>{typeString}</Button>
      </DialogActions>
    </Dialog>
  )
}

export function CreateChatDialog({ sendJsonMessage, open, setOpen }: {
  sendJsonMessage: (arg0: Request) => void,
  open: boolean,
  setOpen: (arg0: boolean) => void
}) {
  const [chatName, setChatName] = useState("")
  const chat = useSelector(state => state.chat.value)
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
        <Button onClick={() => {
          if (chatName === "") return
          sendJsonMessage({
            uid: chat,
            type: RequestType.CTL_NEWSE,
            usrname: chatName,
            msg: ""
          })
          setOpen(false)
        }}>create</Button>
      </DialogActions>
    </Dialog>
  )
}


export function Toolbar({ sendJsonMessage }: {
  sendJsonMessage: (arg0: Request) => void
}) {
  const [joinChatDialogOpen, setJoinChatDialogOpen] = useState(false)
  const [quitChatDialogOpen, setQuitChatDialogOpen] = useState(false)
  const [createChatDialogOpen, setCreateChatDialogOpen] = useState(false)
  const dispatch = useDispatch()
  const chat = useSelector(state => state.chat.value)
  const chats = useSelector(state => state.chat.values)
  const username = useSelector(state => state.username.value)
  return (
    <>
      <ToolbarDialog
        afterJoin={sess => {
          dispatch(addChat(sess))
          dispatch(changeChat(sess))
        }} 
        sendJsonMessage={sendJsonMessage} 
        typeNumber={RequestType.CTL_JOINS}
        typeString="join"
        open={joinChatDialogOpen}
        setOpen={setJoinChatDialogOpen}
      />
      <ToolbarDialog
        afterJoin={(chat2) => {
          dispatch(removeChat(chat2))
          if (chat == chat2) {
            dispatch(changeChat(chats[0]))
            sendJsonMessage({
              uid: chats[0],
              type: RequestType.CTL_SNAME,
              usrname: "",
              msg: ""
            })
          }
        }} 
        sendJsonMessage={sendJsonMessage} 
        typeNumber={RequestType.CTL_QUITS}
        typeString="quit"
        open={quitChatDialogOpen}
        setOpen={setQuitChatDialogOpen}
      />
      <CreateChatDialog sendJsonMessage={sendJsonMessage} open={createChatDialogOpen} setOpen={setCreateChatDialogOpen} />

      <ToolbarRoot ariaLabel="toolbar" icon={<SpeedDialIcon />}>
        <SpeedDialAction icon={<GroupAddOutlinedIcon />} tooltipTitle="join chat" onClick={() => {
          setJoinChatDialogOpen(true)
        }} />
        <SpeedDialAction icon={<GroupRemoveOutlinedIcon />} tooltipTitle="quit chat" onClick={() => {
          setQuitChatDialogOpen(true)
        }} />
        <SpeedDialAction icon={<AddCircleOutlineOutlinedIcon />} tooltipTitle="create chat" onClick={() => {
          setCreateChatDialogOpen(true)
        }} />
      </ToolbarRoot>
    </>
  )
}