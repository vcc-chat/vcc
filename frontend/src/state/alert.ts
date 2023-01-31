import { StateCreator } from "zustand"

interface AlertState {
  successAlert: ((msg: string) => void) | null
  errorAlert: ((msg: string) => void) | null
  setSuccessAlert: (alert: (msg: string) => void) => void
  setErrorAlert: (alert: (msg: string) => void) => void
}
const createAlertSlice: StateCreator<AlertState> = set => ({
  successAlert: null,
  errorAlert: null,
  setSuccessAlert(alert) {
    set({ successAlert: alert })
  },
  setErrorAlert(alert) {
    set({ errorAlert: alert })
  }
})

export default createAlertSlice