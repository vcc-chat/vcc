import styled from "styled-components"
import PureButton from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Dialog from "@mui/material/Dialog"
import Backdrop from "@mui/material/Backdrop"

export const FormList = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.5em;
  height: 100%;
  flex: 1;
`
export const FormItem = styled.div`
  display: flex;
  & + & {
    border-top: 1px solid var(--gray-400);
  }
`

export const FormInput = styled(TextField)``

export const Form = styled.div`
  margin-top: auto;
  margin-bottom: 0.5em;
  margin-left: 0.2em;
  margin-right: 0.2em;
  display: flex;
  flex-direction: column;
  position: relative;
  
`

export const FormInputs = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 0.5em;
  overflow: hidden;
`

export const Button = styled(PureButton)`
  position: absolute;
  bottom: 0;
  right: 0;
`

export const LoginButton = styled(PureButton)`
  margin: 0.25em;
  margin-top: 0;
`

export const MyBackdrop = styled(Backdrop)`
  color: #fff;
`

export const MyDialog = styled(Dialog)`
  backdrop-filter: blur(4px);
`
