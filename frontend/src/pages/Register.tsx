import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import TextField from "@mui/material/TextField"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"

import { LoginButton, MyDialog } from "../Form"
import { RequestType, Request } from "../config"
import { useSelector, useDispatch } from "../store"
import { useNetwork } from "../hooks"
import { LoginType } from "../state/login"
import { useAuth } from "../hooks"

export default function Register(props: {}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const dispatch = useDispatch()
  const loginStatus = useSelector(state => state.login.type)
  const navigate = useNavigate()
  const { sendJsonMessage } = useNetwork()
  useAuth(false)
  useEffect(() => {
    if (loginStatus == LoginType.LOGIN_SUCCESS) {
      navigate(-1)
    }
  }, [loginStatus])
  function loginCallback() {
    navigate("/login")
  }
  function registerCallback() {
    const msg: Request = {
      uid: 0,
      type: RequestType.CTL_REGIS,
      usrname: username,
      msg: password
    }
    sendJsonMessage(msg)
  }
  return (
    <>
      <MyDialog open={loginStatus == LoginType.NOT_LOGIN}>
        <DialogTitle>Register</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Don't have an account? Register one! You don't need any personal information.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="User name"
            type="text"
            fullWidth
            variant="standard"
            value={username}
            onChange={ev => {
              setUsername(ev.target.value)
            }}
          />
          <TextField
            autoFocus
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="standard"
            value={password}
            onChange={ev => {
              setPassword(ev.target.value)
            }}
          />
        </DialogContent>
        <DialogActions>
          <LoginButton size="medium" onClick={loginCallback}>Back to Login</LoginButton>
          <LoginButton size="medium" onClick={registerCallback}>Register</LoginButton>
        </DialogActions>
      </MyDialog>
    </>
  )
}