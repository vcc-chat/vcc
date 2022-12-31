import { useEffect, useState } from "react"
import { useNavigate, Form } from "react-router-dom"
import TextField from "@mui/material/TextField"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"

import { LoginButton, MyDialog } from "../Form"
import { RequestType, Request } from "../config"
import { useSelector, useDispatch } from "../store"
import { useNetwork } from "../hooks"
import { useRegisterActionData } from "../loaders"
import { LoginType } from "../state/login"

export default function Register(props: {}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const loginStatus = useSelector(state => state.login.type)
  const navigate = useNavigate()
  const { successAlert, errorAlert } = useNetwork()
  const result = useRegisterActionData()
  useEffect(() => {
    if (loginStatus == LoginType.LOGIN_SUCCESS) {
      navigate("/")
    }
  }, [loginStatus])

  function loginCallback() {
    navigate("/login")
  }
  useEffect(() => {
    (async () => {
      if (result === undefined) return
      const { success } = result
      if (success) {
        successAlert("The account has been registered successfully, you can login now. ")
        navigate("/login")
      } else {
        errorAlert("Operation failed. ")
      }
    })()
  }, [result])
  return (
    <>
      <MyDialog open={loginStatus == LoginType.NOT_LOGIN}>
        <Form method="post">
          <DialogTitle>Register</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Don't have an account? Register one! You don't need any personal information.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              name="username"
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
              name="password"
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
            <LoginButton size="medium" type="submit">Register</LoginButton>
          </DialogActions>
        </Form>
      </MyDialog>
    </>
  )
}