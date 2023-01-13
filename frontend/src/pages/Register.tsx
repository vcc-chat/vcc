import { useEffect, useState } from "react"
import { useNavigate, Form } from "react-router-dom"
import classNames from "classnames"

import { RequestType, Request } from "../config"
import { useNetwork } from "../tools"
import { useRegisterActionData } from "../loaders"
import { LoginType } from "../state/login"
import useStore from "../store"

export default function Register(props: {}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const loginStatus = useStore(state => state.type)
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
      <div className={classNames("hero min-h-screen bg-base-200", {
        "hidden": loginStatus != LoginType.NOT_LOGIN
      })}>
        <Form method="post" className="hero-content flex-col lg:flex-row-reverse">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl font-bold">Register now!</h1>
            <p className="py-6">Don't have an account? Register one! You don't need any personal information.</p>
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
                    setUsername(ev.target.value)
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
                    navigate("/login")
                    console.log(1)
                  }} type="button">Go to login</button>
                  <button className="ml-2 flex-1 btn btn-primary" type="submit">Register</button>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </>
  )
}