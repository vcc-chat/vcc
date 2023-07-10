import { StateCreator } from "zustand"

interface Alert {
  type: "success" | "error"
  content: string
  index: number
}

interface AlertState {
  createAlert: (newAlert: Alert) => void
  successAlert: (msg: string) => void
  errorAlert: (msg: string) => void
  alerts: Alert[]
  alertTotalIndex: number
}

const alertCloseTime = 5000

const createAlertSlice: StateCreator<AlertState> = (set, get) => ({
  createAlert(newAlert) {
    console.trace()
    set(({ alerts, alertTotalIndex }) => ({
      alerts: alerts.concat(newAlert),
      alertTotalIndex: alertTotalIndex + 1
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
      content: msg,
      index: get().alertTotalIndex
    })
  },
  errorAlert(msg) {
    get().createAlert({
      type: "error",
      content: msg,
      index: get().alertTotalIndex
    })
  },
  alerts: [],
  alertTotalIndex: 0
})

export default createAlertSlice
