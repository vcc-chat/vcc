import type { TargetedEvent } from "preact/compat"
import { useEffect, useState } from "preact/hooks"
import { useTranslation } from "react-i18next"

import useStore from "../store"

function urlCorrect(urlString: string) {
  try {
    const url = new URL(urlString)
    return (url.protocol == "ws:" && location.protocol == "http:") || url.protocol == "wss:"
  } catch (e) {
    return false
  }
}
const defaultServer: string =
  import.meta.env.VITE_DEFAULT_SERVER_ADDRESS || location.origin.replace("http", "ws") + "/ws/"
export default function ChooseBackend() {
  const backendAddress = useStore(state => state.backendAddress)
  const setBackendAddress = useStore(state => state.setBackendAddress)

  const [serverAddress, setServerAddress] = useState(defaultServer)

  useEffect(() => {
    setServerAddress(backendAddress ?? defaultServer)
  }, [backendAddress])

  const { t } = useTranslation()

  return (
    <div className="form-control">
      <label className="join max-sm:join-vertical">
        <input
          type="text"
          className="input input-bordered input-sm join-item"
          value={serverAddress}
          onInput={(ev: TargetedEvent<HTMLInputElement, Event>) => {
            setServerAddress(ev.currentTarget.value)
          }}
        />
        <button
          className="btn btn-primary btn-sm join-item"
          disabled={backendAddress == serverAddress || !urlCorrect(serverAddress)}
          type="button"
          onClick={() => {
            setBackendAddress(serverAddress)
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
