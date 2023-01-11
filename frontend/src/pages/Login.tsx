
import { useEffect, useState } from "react"
import { useNavigate, Form } from "react-router-dom"
import localforage from "localforage"
import classNames from "classnames"

import { useSelector, useDispatch } from "../store"
import { change as changeUsername } from "../state/username"
import { reset, startGet, success, failed, LoginType } from "../state/login"
import { useLoginActionData } from "../loaders"
import { useNetwork } from "../tools"

export function LoginDialog(props: {}) {
  const [password, setPassword] = useState("")
  const username = useSelector(state => state.username.value)
  const loginStatus = useSelector(state => state.login.type)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const loginActionData = useLoginActionData()
  const { errorAlert } = useNetwork()
  useEffect(() => {
    (async () => {
      if (loginActionData === undefined) return
      if (loginActionData.success) {
        dispatch(success())
        await localforage.setItem("token", loginActionData.token)
        navigate("/")
      } else {
        errorAlert("Operation failed")
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
      <div className={classNames("hero min-h-screen bg-base-200", {
        "hidden": loginStatus != LoginType.NOT_LOGIN
      })}>
        <Form method="post" className="hero-content flex-col lg:flex-row-reverse" onSubmit={() => {
          dispatch(startGet())
        }}>
          <div className="text-center lg:text-left">
            <h1 className="text-5xl font-bold">Login now!</h1>
            <p className="py-6">To send messages, you need to login first.</p>
          </div>
          <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
            <div className="card-body">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Username</span>
                </label>
                <input
                  type="text"
                  placeholder="Username"
                  className="input input-bordered"
                  name="username" 
                  value={username}
                  onChange={ev => {
                    dispatch(changeUsername(ev.target.value))
                  }}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Password</span>
                </label>
                <input type="password" placeholder="Password" className="input input-bordered" name="password" />
              </div>
              <div className="form-control mt-6">
                <div className="flex w-full">
                  <button className="btn" onClick={() => {
                    navigate("/register")
                    console.log(1)
                  }} type="button">Go to register</button>
                  <button className="ml-2 flex-1 btn btn-primary" type="submit">Login</button>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </>
  )
}

export default function Login() {
  return (
    <LoginDialog />
  )
}