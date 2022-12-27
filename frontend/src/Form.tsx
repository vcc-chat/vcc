import { useState } from "react"
import styled from "styled-components"
import PureButton from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import CircularProgress from '@mui/material/CircularProgress'
import Backdrop from '@mui/material/Backdrop'

import { RequestType, Request } from "./config"
import { useSelector, useDispatch } from './store'
import { change as changeUsername } from "./state/username"
import { reset, startGet, register, LoginType } from "./state/login"

export const FormList = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.5em;
  height: 100%;
  flex: 1;
`
export const FormItem = styled.div`
  display: flex;
  & + & {
    border-top: 1px solid var(--gray-400);
  }
`

export const FormInput = styled(TextField)``

export const SendButton = styled.button`
  display: flex;
  border: none;
  padding: 0.5em;
  border-radius: 0.2em;
  background-color: var(--gray-300);
  font-family: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  border-bottom-right-radius: 0.5em;
  &:disabled {
    cursor: not-allowed
  }
`

export const Form = styled.div`
  margin-top: auto;
  margin-bottom: 0.5em;
  margin-left: 0.2em;
  margin-right: 0.2em;
  display: flex;
  flex-direction: column;
  position: relative;
  
`

export const FormInputs = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 0.5em;
  overflow: hidden;
`

export const Button = styled(PureButton)`
  position: absolute;
  bottom: 0;
  right: 0;
`

const LoginButton = styled(PureButton)`
  margin: 0.25em;
  margin-top: 0;
`

const MyBackdrop = styled(Backdrop)`
  color: #fff;
`

export const MyDialog = styled(Dialog)`
  backdrop-filter: blur(4px);
`

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

export function LoginDialog({ sendJsonMessage }: {
  sendJsonMessage: (req: Request) => void
}) {
  const [password, setPassword] = useState("")
  const username = useSelector(state => state.username.value)
  const loginStatus = useSelector(state => state.login.type)
  const dispatch = useDispatch()
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
    dispatch(register())
  }
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
      <RegisterDialog sendJsonMessage={sendJsonMessage} />
    </>
  )
}

export function RegisterDialog({ sendJsonMessage }: {
  sendJsonMessage: (req: Request) => void
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const dispatch = useDispatch()
  const loginStatus = useSelector(state => state.login.type)
  function loginCallback() {
    dispatch(reset())
  }
  function registerCallback() {
    const msg: Request = {
      uid: 0,
      type: RequestType.CTL_REGIS,
      usrname: username,
      msg: password
    }
    sendJsonMessage(msg)
    dispatch(reset())
  }
  return (
    <>
      <MyDialog open={loginStatus == LoginType.REGISTER}>
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
        <LoginButton size="medium" onClick={loginCallback}>Go to Login</LoginButton>
          <LoginButton size="medium" onClick={registerCallback}>Register</LoginButton>
        </DialogActions>
      </MyDialog>
    </>
  )
}