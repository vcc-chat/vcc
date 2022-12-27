import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import Button from "@mui/material/Button"

import { RequestType, Request } from "../config"
import { useSelector, useDispatch } from "../store"
import { changeValue } from "../state/chat"



export default function Invite({ sendJsonMessage, ready }: {
  sendJsonMessage: (arg: Request) => void,
  ready: boolean
}) {
  const { id } = useParams()
  const chat = parseInt(String(id), 10)
  const chats = useSelector(state => state.chat.values)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  return (
    <>
      {ready && (
        <>
          <Dialog open={!chats.includes(chat)}>
            <DialogTitle>Join chat</DialogTitle>
            <DialogContent>
              <DialogContentText>Would you like to join chat {id}?</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button size="medium" onClick={() => {

                sendJsonMessage({
                  uid: chat,
                  type: RequestType.CTL_JOINS,
                  usrname: "",
                  msg: ""
                })
                dispatch(changeValue(chat))
                sendJsonMessage({
                  uid: 0,
                  type: RequestType.CTL_LJOIN,
                  usrname: "",
                  msg: ""
                })
                navigate("/")
              }}>join</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={chats.includes(chat)}>
            <DialogTitle>Join chat</DialogTitle>
            <DialogContent>
              <DialogContentText>You have already joined chat {id}.</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button size="medium" onClick={() => {
                navigate("/")
              }}>go back to home</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </>
  )
}
