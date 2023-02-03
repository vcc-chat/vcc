import { useCallback, useEffect } from "preact/hooks"
import { useNavigate, Form } from "react-router-dom"
import classNames from "classnames"
import { useTranslation } from "react-i18next"

import { useNetwork, useTitle } from "../tools"
import { useRegisterActionData } from "../loaders"
import { LoginType } from "../state/login"
import useStore from "../store"

export default function Register(props: {}) {
  const loginStatus = useStore(state => state.type)
  const navigate = useNavigate()
  const { successAlert, errorAlert } = useNetwork()
  const result = useRegisterActionData()
  const { t } = useTranslation()
  useEffect(() => {
    if (loginStatus == LoginType.LOGIN_SUCCESS) {
      navigate("/")
    }
  }, [loginStatus])

  const loginCallback = useCallback(function () {
    navigate("/login")
  }, [navigate])
  useEffect(() => {
    (async () => {
      if (result === undefined) return
      const { success } = result
      if (success) {
        successAlert(t("The account has been registered successfully, you can login now. "))
        navigate("/login")
      } else {
        errorAlert(t("Operation failed. "))
      }
    })()
  }, [result])

  useTitle("Register")

  return (
    <>
      <div className={classNames("hero min-h-screen bg-base-200", {
        "hidden": loginStatus != LoginType.NOT_LOGIN
      })}>
        <Form method="post" className="hero-content flex-col lg:flex-row-reverse">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl font-bold">{t("Register now!")}</h1>
            <p className="py-6">{t("Don't have an account? Register one! You don't need any personal information.")}</p>
          </div>
          <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
            <div className="card-body">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t("Username")}</span>
                </label>
                <input
                  type="text"
                  placeholder={t("Username") ?? undefined}
                  className="input input-bordered"
                  name="username"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t("Password")}</span>
                </label>
                <input type="password" placeholder={t("Password") ?? undefined} className="input input-bordered" name="password" />
              </div>
              <div className="form-control mt-6">
                <div className="flex w-full btn-group">
                  <button className="btn btn-ghost" onClick={loginCallback} type="button">
                    {t("Login")}
                  </button>
                  <button className="flex-1 btn btn-primary" type="submit">{t("Register")}</button>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </>
  )
}