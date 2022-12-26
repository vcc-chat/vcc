import { useState, useEffect } from "react"
import Snackbar from "@mui/material/Snackbar"
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

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
    if (window.Notification.permission == "granted" || window.Notification.permission == "denied") return
    if (location.protocol != "https") return
    const id = setTimeout(() => setOpen(true), 10000)
    return () => clearTimeout(id)
  }, [])
  return (
    <Snackbar
      open={open} 
      autoHideDuration={10000}
      onClose={() => {
        setOpen(false)
      }}
      message="Would you like to get messages via notifications?"
      action={
        <>
          <Button color="secondary" size="small" onClick={async () => {
            await window.Notification.requestPermission()
            setOpen(false)
          }}>
            Sure
          </Button>
          <IconButton
            size="small"
            color="inherit"
            onClick={() => {
              setOpen(false)
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      }
    />
  )
}

