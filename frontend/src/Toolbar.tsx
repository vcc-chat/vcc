
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

import { Request, REQ, VCC_MAGIC } from "./config"
import { useDispatch, useSelector } from "./store"
import { change as changeSession } from "./state/session"

const ToolbarRoot = styled(SpeedDial)`
  position: fixed;
  bottom: 64px;
  right: 16px;
`

function ToolbarDialog({ afterJoin, sendJsonMessage, typeNumber, typeString, open, setOpen }: {
  afterJoin: (arg0: number) => void,
  sendJsonMessage: (arg0: Request) => void,
  typeNumber: REQ,
  typeString: string,
  open: boolean,
  setOpen: (arg0: boolean) => void
}) {
  const [dialogValue, setDialogValue] = useState("")
  const title = typeString[0].toUpperCase() + typeString.slice(1)
  const username = useSelector(state => state.username.value)
  return (
    <Dialog open={open}>
      <DialogTitle>{title} session</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter the session number you want to {typeString}.
        </DialogContentText>
        <TextField 
          autoFocus 
          label="Session id" 
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} 
          margin="dense" 
          value={dialogValue} 
          onChange={ev => setDialogValue(ev.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>close</Button>
        <Button onClick={() => {
          let session: number
          try {
            session = parseInt(dialogValue)
          } catch (e) {
            return
          }
          if (session === null) return
          sendJsonMessage({
            magic: VCC_MAGIC,
            uid: 0,
            session,
            flags: 0,
            type: typeNumber,
            usrname: username,
            msg: ""
          })
          setOpen(false)
          afterJoin(session)
        }}>{typeString}</Button>
      </DialogActions>
    </Dialog>
  )
}

export function CreateSessionDialog({ sendJsonMessage, open, setOpen }: {
  sendJsonMessage: (arg0: Request) => void,
  open: boolean,
  setOpen: (arg0: boolean) => void
}) {
  const [sessionName, setSessionName] = useState("")
  const session = useSelector(state => state.session.value)
  return (
    <Dialog open={open}>
      <DialogTitle>Create session</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter the name of the session you want to create.
        </DialogContentText>
        <TextField 
          autoFocus 
          label="Session name" 
          margin="dense" 
          value={sessionName} 
          onChange={ev => setSessionName(ev.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>close</Button>
        <Button onClick={() => {
          if (sessionName === "") return
          sendJsonMessage({
            magic: VCC_MAGIC,
            uid: 0,
            session,
            flags: 0,
            type: REQ.CTL_NEWSE,
            usrname: sessionName,
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
  const [joinSessionDialogOpen, setJoinSessionDialogOpen] = useState(false)
  const [quitSessionDialogOpen, setQuitSessionDialogOpen] = useState(false)
  const [createSessionDialogOpen, setCreateSessionDialogOpen] = useState(false)
  const dispatch = useDispatch()
  const session = useSelector(state => state.session.value)
  const username = useSelector(state => state.username.value)
  return (
    <>
      <ToolbarDialog
        afterJoin={sess => {
          dispatch(changeSession(sess))
        }} 
        sendJsonMessage={sendJsonMessage} 
        typeNumber={REQ.CTL_JOINS}
        typeString="join"
        open={joinSessionDialogOpen}
        setOpen={setJoinSessionDialogOpen}
      />
      <ToolbarDialog
        afterJoin={(sess) => {
          if (session == sess) {
            dispatch(changeSession(0))
          }
        }} 
        sendJsonMessage={sendJsonMessage} 
        typeNumber={REQ.CTL_QUITS}
        typeString="quit"
        open={quitSessionDialogOpen}
        setOpen={setQuitSessionDialogOpen}
      />
      <CreateSessionDialog sendJsonMessage={sendJsonMessage} open={createSessionDialogOpen} setOpen={setCreateSessionDialogOpen} />

      <ToolbarRoot ariaLabel="toolbar" icon={<SpeedDialIcon />}>
        <SpeedDialAction icon={<GroupAddOutlinedIcon />} tooltipTitle="join session" onClick={() => {
          setJoinSessionDialogOpen(true)
        }} />
        <SpeedDialAction icon={<GroupRemoveOutlinedIcon />} tooltipTitle="quit session" onClick={() => {
          setQuitSessionDialogOpen(true)
        }} />
        <SpeedDialAction icon={<AddCircleOutlineOutlinedIcon />} tooltipTitle="create session" onClick={() => {
          setCreateSessionDialogOpen(true)
        }} />
      </ToolbarRoot>
    </>
  )
}