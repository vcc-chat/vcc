import { createSlice } from "@reduxjs/toolkit"

// login

export const enum LoginType {
  NOT_LOGIN = 0,
  LOGIN_LOADING = 1,
  LOGIN_FAILED = 2,
  LOGIN_SUCCESS = 3,
  TOKEN_LOGIN = 4
}

interface LoginObjectType {
  type: LoginType
}

const loginState: LoginObjectType = {
  type: LoginType.TOKEN_LOGIN
}

const loginSlice = createSlice({
  name: "login",
  initialState: loginState,
  reducers: {
    success(state: LoginObjectType) {
      state.type = LoginType.LOGIN_SUCCESS
    },
    failed(state: LoginObjectType) {
      state.type = LoginType.LOGIN_FAILED
    },
    startGet(state: LoginObjectType) {
      state.type = LoginType.LOGIN_LOADING
    },
    reset(state: LoginObjectType) {
      state.type = LoginType.NOT_LOGIN
    },
    tokenLogin(state: LoginObjectType) {
      state.type = LoginType.TOKEN_LOGIN
    }
  }
})

export const { success, failed, startGet, reset, tokenLogin } = loginSlice.actions

export default loginSlice.reducer