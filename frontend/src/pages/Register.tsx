import { useEffect, useState } from "react"
import { useNavigate, Form } from "react-router-dom"
import {
  TextField,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Dialog,
  Button
} from "@mui/material"

import { RequestType, Request } from "../config"
import { useSelector, useDispatch } from "../store"
import { useNetwork } from "../tools"
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
      <Dialog open={loginStatus == LoginType.NOT_LOGIN}>
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
            <Button className="m-1 mt-0" size="medium" onClick={loginCallback}>Back to Login</Button>
            <Button className="m-1 mt-0" size="medium" type="submit">Register</Button>
          </DialogActions>
        </Form>
      </Dialog>
    </>
  )
}