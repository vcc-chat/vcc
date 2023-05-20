import { StateCreator } from "zustand"

interface Alert {
  type: "success" | "error"
  content: string
}

interface AlertState {
  createAlert: (newAlert: Alert) => void
  successAlert: (msg: string) => void
  errorAlert: (msg: string) => void
  alerts: Alert[]
}

const alertCloseTime = 5000

const createAlertSlice: StateCreator<AlertState> = (set, get) => ({
  createAlert(newAlert) {
    console.trace()
    set(({ alerts }) => ({
      alerts: alerts.concat(newAlert)
    }))
    setTimeout(() => {
      set(({ alerts }) => ({
        alerts: alerts.filter(alert => alert != newAlert)
      }))
    }, alertCloseTime)
  },
  successAlert(msg) {
    get().createAlert({
      type: "success",
      content: msg
    })
  },
  errorAlert(msg) {
    get().createAlert({
      type: "error",
      content: msg
    })
  },
  alerts: []
})

export default createAlertSlice
