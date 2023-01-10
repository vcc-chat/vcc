
import { useEffect, useState } from "react"
import { useNavigate, Form } from "react-router-dom"
import localforage from "localforage"
import {
  Button as PureButton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Button,
  Backdrop
} from "@mui/material"

import { useSelector, useDispatch } from "../store"
import { change as changeUsername } from "../state/username"
import { reset, startGet, success, failed, LoginType } from "../state/login"
import { useLoginActionData } from "../loaders"

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
  const loginActionData = useLoginActionData()
  useEffect(() => {
    (async () => {
      if (loginActionData === undefined) return
      if (loginActionData.success) {
        dispatch(success())
        await localforage.setItem("token", loginActionData.token)
        navigate("/")
      } else {
        dispatch(failed())
      }
    })()
  }, [loginActionData])

  useEffect(() => {
    if (loginStatus == LoginType.LOGIN_SUCCESS) {
      navigate("/")
    }
  }, [loginStatus])
  return (
    <>
      <Dialog open={loginStatus == LoginType.NOT_LOGIN}>
        <Form method="post" onSubmit={() => {
          dispatch(startGet())
        }}>
          <DialogTitle>Login</DialogTitle>
          <DialogContent>
            <DialogContentText>
              To send messages, you must login first.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="User name"
              name="username"
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
              name="password"
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
            <Button size="medium" onClick={() => {
              navigate("/register")
            }} className="m-1 mt-0">Register</Button>
            <Button className="m-1 mt-0" size="medium" type="submit">Login</Button>
          </DialogActions>
        </Form>
      </Dialog>
      <Backdrop className="text-white" open={loginStatus == LoginType.LOGIN_LOADING}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <LoginErrorDialog open={loginStatus == LoginType.LOGIN_FAILED}></LoginErrorDialog>
    </>
  )
}

export default function Login() {
  return (
    <LoginDialog />
  )
}