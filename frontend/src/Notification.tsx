import { useState, useEffect } from "react"
import CloseIcon from "@material-design-icons/svg/outlined/close.svg"
import { queryClient } from "./tools"
import classNames from "classnames"

export function notify(title: string, body: string) {
  if (window.Notification.permission !== "granted")
    return
  if (document.hidden) {
    new window.Notification(title, {
      body
    })
  }
    
}

export function Notification(props: {}) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!window.Notification) return
    if (window.Notification.permission == "granted" || window.Notification.permission == "denied") return
    if (location.protocol != "https") return
    const id = setTimeout(() => {
      setOpen(true)
      setTimeout(() => {
        setOpen(false)
      }, 10000)
    }
    , 10000)
    return () => clearTimeout(id)
  }, [])
  return (
    <div className={classNames("toast toast-start", {
      "hidden": !open
    })}>
      <div className="alert alert-info mb-16">
        <div>
          <span>Would you like to get messages via notifications?</span>
          <button className="btn btn-ghost" onClick={async () => {
            await window.Notification.requestPermission()
            setOpen(false)
          }}>
            Sure
          </button>
          <button className="btn btn-square btn-ghost z-50" onClick={() => {
            setOpen(false)
          }}>
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

