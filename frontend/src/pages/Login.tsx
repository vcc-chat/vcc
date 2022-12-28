
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import PureButton from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import CircularProgress from "@mui/material/CircularProgress"

import { LoginButton, MyBackdrop, MyDialog } from "../Form"
import { RequestType, Request } from "../config"
import { useSelector, useDispatch } from "../store"
import { useNetwork } from "../hooks"
import { change as changeUsername } from "../state/username"
import { reset, startGet, LoginType } from "../state/login"
import { useAuth } from "../hooks"

export function LoginErrorDialog({ open }: {
  open: boolean
}) {
  const dispatch = useDispatch()
  return (
    <Dialog open={open}>
      <DialogTitle>Login failed</DialogTitle>
      <DialogContent>
        <DialogContentText>Wrong username or password, maybe you can try it again later. </DialogContentText>
      </DialogContent>
      <DialogActions>
        <PureButton size="medium" color="error" onClick={() => dispatch(reset())}>retry</PureButton>
      </DialogActions>
    </Dialog>
  )
}

export function LoginDialog(props: {}) {
  const [password, setPassword] = useState("")
  const username = useSelector(state => state.username.value)
  const loginStatus = useSelector(state => state.login.type)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { sendJsonMessage } = useNetwork()
  useAuth(false)
  function loginCallback() {
    const msg: Request = {
      uid: 0,
      type: RequestType.CTL_LOGIN,
      usrname: username,
      msg: password
    }
    sendJsonMessage(msg)
    dispatch(startGet())
  }
  function registerCallback() {
    navigate("/register")
  }
  useEffect(() => {
    if (loginStatus == LoginType.LOGIN_SUCCESS) {
      navigate("/")
    }
  }, [loginStatus])
  return (
    <>
      <MyDialog open={loginStatus == LoginType.NOT_LOGIN}>
        <DialogTitle>Login</DialogTitle>
        <DialogContent>
          <DialogContentText>
            To send messages, you must login first.
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
              dispatch(changeUsername(ev.target.value))
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
          <LoginButton size="medium" onClick={registerCallback}>Register</LoginButton>
          <LoginButton size="medium" onClick={loginCallback}>Login</LoginButton>
        </DialogActions>
      </MyDialog>
      <MyBackdrop open={loginStatus == LoginType.LOGIN_LOADING}>
        <CircularProgress color="inherit" />
      </MyBackdrop>
      <LoginErrorDialog open={loginStatus == LoginType.LOGIN_FAILED}></LoginErrorDialog>
    </>
  )
}

export default function Login() {
  return (
    <LoginDialog />
  )
}