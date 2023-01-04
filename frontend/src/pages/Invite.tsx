import { useState, useEffect } from "react"
import { useNavigate, useSearchParams, useLoaderData } from "react-router-dom"

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button
} from "@mui/material"

import { RequestType, Request } from "../config"
import { useSelector, useDispatch } from "../store"
import { useChatList, useNetwork } from "../tools"
import { changeValue } from "../state/chat"


export default function Invite(props: {}) {
  const { makeRequest, ready, successAlert, errorAlert } = useNetwork()
  const { chat, token } = useLoaderData() as { chat: number, token: string }
  const { refresh: refreshChats, values: chats } = useChatList()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  return (
    <>
      {ready && (
        <>
          <Dialog open={!chats.includes(chat)}>
            <DialogTitle>Join chat</DialogTitle>
            <DialogContent>
              <DialogContentText>Would you like to join chat {chat}?</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button size="medium" onClick={async () => {
                const { uid } = await makeRequest({
                  type: RequestType.CTL_INVIT,
                  msg: token
                })
                console.log(uid)
                if (uid) {
                  successAlert("You have joined the chat successfully. ")
                  dispatch(changeValue(chat))
                  refreshChats()
                } else {
                  errorAlert("Unexpected error occurred. ")
                }
                navigate("/")
              }}>join</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={chats.includes(chat)}>
            <DialogTitle>Join chat</DialogTitle>
            <DialogContent>
              <DialogContentText>You have already joined chat {chat}.</DialogContentText>
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
