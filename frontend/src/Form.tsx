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

import { REQ, Request, VCC_MAGIC } from "./config"

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

export function LoginErrorDialog({ open, clear }: {
  open: boolean,
  clear: () => void
}) {
  return (
    <Dialog open={open}>
      <DialogTitle>Login failed</DialogTitle>
      <DialogContent>
        <DialogContentText>Wrong username or password, maybe you can try it again later. </DialogContentText>
      </DialogContent>
      <DialogActions>
        <PureButton size="medium" color="error" onClick={() => clear()}>retry</PureButton>
      </DialogActions>
    </Dialog>
  )
}

export function LoginDialog({ session, username, setUsername, sendJsonMessage, loginError, loginSuccess, clear }: {
  session: number,
  username: string,
  setUsername: (arg0: string) => void,
  sendJsonMessage: (req: Request) => void,
  loginError: boolean,
  loginSuccess: boolean,
  clear: () => void
}) {
  const [isLogin, setIsLogin] = useState(false)
  const [password, setPassword] = useState("")
  function loginCallback() {
    const msg: Request = {
      magic: VCC_MAGIC,
      uid: 0,
      session,
      flags: 0,
      type: REQ.CTL_LOGIN,
      usrname: username,
      msg: password
    }
    sendJsonMessage(msg)
    setIsLogin(true)
  }
  return (
    <>
      <Dialog open={!isLogin}>
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
          <LoginButton size="medium" onClick={loginCallback}>Login</LoginButton>
        </DialogActions>
      </Dialog>
      <MyBackdrop open={isLogin && !loginSuccess && !loginError}>
        <CircularProgress color="inherit" />
      </MyBackdrop>
      <LoginErrorDialog open={isLogin && loginError} clear={() => {
        clear()
        setIsLogin(false)
      }}></LoginErrorDialog>
    </>
  )
}