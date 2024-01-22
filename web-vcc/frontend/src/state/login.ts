import { StateCreator } from "zustand"

export const enum LoginType {
  NOT_LOGIN = 0,
  LOGIN_LOADING = 1,
  LOGIN_FAILED = 2,
  LOGIN_SUCCESS = 3,
  TOKEN_LOGIN = 4
}

interface LoginState {
  type: LoginType
  username: string
  userID: number
  token: string | null
  success: () => void
  failed: () => void
  startGet: () => void
  reset: () => void
  tokenLogin: () => void
  setToken: (token: string | null) => void
  changeUsername: (username: string) => void
  changeUserID: (uid: number) => void
}

const createLoginSlice: StateCreator<LoginState> = set => ({
  type: LoginType.TOKEN_LOGIN,
  username: "",
  userID: -1,
  token: null,
  success() {
    set({ type: LoginType.LOGIN_SUCCESS })
  },
  failed() {
    set({ type: LoginType.LOGIN_FAILED })
  },
  startGet() {
    set({ type: LoginType.LOGIN_LOADING })
  },
  reset() {
    set({ type: LoginType.NOT_LOGIN })
  },
  tokenLogin() {
    set({ type: LoginType.TOKEN_LOGIN })
  },
  setToken(token: string | null) {
    set({ token })
  },
  changeUsername(username: string) {
    set({ username: username })
  },
  changeUserID(uid: number) {
    set({ userID: uid })
  }
})

export default createLoginSlice
