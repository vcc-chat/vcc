import { useState } from "react"
import styled from "styled-components"
import { Store } from "react-notifications-component"
import { REQ, Request, VCC_MAGIC } from "./config"

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

export const FormInput = styled.input`
  outline: none;
  border-width: 1px;
  border-color: var(--gray-400);
  padding: 0.5em;
  font-family: inherit;
  letter-spacing: inherit;
  background-color: var(--gray-200);
  width: 100%;
  border: none;
  &:disabled {
    color: var(--gray-500)
  }
`

export const FormInputBig = styled(FormInput)`
  padding-bottom: 4em;
`

export const SendButton = styled.button`
  display: flex;
  position: absolute;
  bottom: 0;
  right: 0;
  border: none;
  padding: 0.5em;
  border-radius: 0.2em;
  background-color: var(--gray-300);
  font-family: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  border-bottom-right-radius: 0.5em;
  &:disabled {
    cursor: not-allowed
  }
`

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

export const ToolbarRoot = styled.div`
  display: flex;
  background-color: var(--gray-200);
  width: 100%;
  padding: 0.2em;
  gap: 0.2em;
`

export const ToolbarIcon = styled.div`
  font-family: var(--icon-font);
  font-size: 1.25rem;
  user-select: none;
  cursor: pointer;
`

export function Toolbar({ sendMessage, msgBody, username }: {
  sendMessage: (arg0: Request) => any,
  msgBody: string,
  username: string
}) {
  return (
    <ToolbarRoot>
      <ToolbarIcon onClick={() => {
        sendMessage({
          magic: VCC_MAGIC,
          type: REQ.CTL_NEWSE,
          uid: 0,
          session: 0,
          flags: 0,
          usrname: username,
          msg: msgBody
        })
        Store.addNotification({
          title: "Success",
          message: "add session successfully",
          container: "top-right",
          type: "success",
          dismiss: {
            showIcon: true,
            click: false,
            duration: 5000
          }
        })
      }}>group_add</ToolbarIcon>
    </ToolbarRoot>
  )
}