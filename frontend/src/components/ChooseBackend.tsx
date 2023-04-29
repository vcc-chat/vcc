import { Form, useNavigate } from "react-router-dom"
import type { TargetedEvent } from "preact/compat"
import { useEffect, useState } from "preact/hooks"
import classNames from "classnames"
import { useTranslation } from "react-i18next"

import useStore from "../store"
import { useTitle } from "../tools"
import { useSignal } from "@preact/signals"

function urlCorrect(urlString: string) {
  try {
    const url = new URL(urlString)
    return (url.protocol == "ws:" && location.protocol == "http:") || url.protocol == "wss:"
  } catch (e) {
    return false
  }
}
const defaultServer = import.meta.env.VITE_DEFAULT_SERVER_ADDRESS || location.origin.replace("http", "ws") + "/ws/"
export default function ChooseBackend() {
  const backendAddress = useStore(state => state.backendAddress)
  const setBackendAddress = useStore(state => state.setBackendAddress)

  const serverAddress = useSignal(defaultServer)

  useEffect(() => {
    serverAddress.value = backendAddress ?? defaultServer
  }, [backendAddress])

  const { t } = useTranslation()

  return (
    <div className="form-control">
      <label className="input-group max-sm:input-group-vertical input-group-sm">
        <input
          type="text"
          className="input input-bordered input-sm"
          value={serverAddress}
          onInput={(ev: TargetedEvent<HTMLInputElement, Event>) => {
            serverAddress.value = ev.currentTarget.value
          }}
        />
        <button
          className="btn btn-primary btn-sm"
          disabled={backendAddress == serverAddress.value || !urlCorrect(serverAddress.value)}
          type="button"
          onClick={() => {
            setBackendAddress(serverAddress.value)
          }}
        >
          {t("Change Server")}
        </button>
      </label>
    </div>
  )
}

export function initBackend() {
  const { backendAddress, setBackendAddress } = useStore.getState()
  if (!backendAddress) {
    setBackendAddress(defaultServer)
  }
}
