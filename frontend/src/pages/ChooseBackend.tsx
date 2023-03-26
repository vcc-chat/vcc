
import { Form, useNavigate } from "react-router-dom"
import type { TargetedEvent } from "preact/compat"
import { useEffect, useState } from "preact/hooks"
import classNames from "classnames"
import { useTranslation } from "react-i18next"

import useStore from "../store"
import { useTitle } from "../tools"

function urlCorrect(urlString: string) {
  try {
    const url = new URL(urlString)
    return (url.protocol == "ws:" && location.protocol == "http:") || url.protocol == "wss:"
  } catch (e) {
    return false
  }
}

export function Component() {
  const backendAddress = useStore(state => state.backendAddress)
  const setBackendAddress = useStore(state => state.setBackendAddress)
  const [serverAddress, setServerAddress] = useState<string>(import.meta.env.DEFAULT_SERVER_ADDRESS)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [useDefaultServerAddress, setUseDefaultServerAddress] = useState(true)
  useEffect(() => {
    if (backendAddress) {
      navigate("/")
    }
  }, [backendAddress])

  useTitle("Choose Server")
  
  return (
    <>
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content flex-col lg:flex-row-reverse">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl font-bold">{t("Choose the server")}</h1>
            <p className="py-6">{t("Choose the server to start.")}</p>
          </div>
          <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
            <div className="card-body">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">{t("Use default server (Recommended)")}</span> 
                  <input type="checkbox" className="toggle" checked={useDefaultServerAddress} onInput={(ev: TargetedEvent<HTMLInputElement, Event>) => {
                    setUseDefaultServerAddress(ev.currentTarget.checked)
                  }} />
                </label>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t("Server address")}</span>
                </label>
                <input
                  type="url"
                  placeholder={t("Server address") ?? undefined}
                  className="input input-bordered"
                  value={serverAddress}
                  disabled={useDefaultServerAddress}
                  onInput={(ev: TargetedEvent<HTMLInputElement, Event>) => {
                    setServerAddress(ev.currentTarget.value)
                  }}
                />
              </div>
              <div className="form-control mt-6 flex space-y-2">
                <button className="btn" onClick={() => {
                  setBackendAddress(useDefaultServerAddress ? `wss://${location.hostname}/ws/` : serverAddress)
                }} disabled={!useDefaultServerAddress && !urlCorrect(serverAddress)} type="button">
                  {t("Continue")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}