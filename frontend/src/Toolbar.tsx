
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useQueryClient, useQuery } from "@tanstack/react-query"

import useStore from "./store"
import { Request, RequestType } from "./config"
import { useNetwork } from "./tools"
import {
  SettingsEditItem,
  allPermissions,
  PermissionKey,
  permissionKeyToName,
} from "./Settings"

export function ToolbarDialog({ afterJoin, typeNumber, typeString, id }: {
  afterJoin: (arg0: number, req: Request) => void,
  typeNumber: RequestType,
  typeString: string,
  id: string
}) {
  const [dialogValue, setDialogValue] = useState("")
  const title = typeString[0].toUpperCase() + typeString.slice(1)
  const { makeRequest } = useNetwork()
  return createPortal((
    <>
      <input type="checkbox" id={id} className="modal-toggle" />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{title} chat</h3>
          <p className="py-4">Enter the chat number you want to {typeString}.</p>
          <input className="input" autoFocus placeholder="Chat id" value={dialogValue} onChange={ev => setDialogValue(ev.target.value)} />
          <div className="modal-action">
            <label htmlFor={id} className="btn">Close</label>
            <button className="btn" onClick={async () => {
              let chat: number
              try {
                chat = parseInt(dialogValue)
              } catch (e) {
                return
              }
              if (chat === null) return
              const request = await makeRequest({
                uid: chat,
                type: typeNumber
              })
              afterJoin(chat, request)
            }}>{typeString}</button>
          </div>
        </div>
      </div>
    </>
  ), document.body)
}

export function EditPermissionDialog({ open, setOpen, uid, username, modifyPermissionDialogID }: {
  open: boolean,
  setOpen: (value: boolean) => void,
  uid: number,
  username: string,
  modifyPermissionDialogID: string
}) {
  const { makeRequest, successAlert, errorAlert } = useNetwork()
  const chat = useStore(state => state.chat)
  const { data: permissionRawData } = useQuery({
    queryKey: ["user-permission", chat],
    queryFn: async () => {
      if (chat == null) return
      const { msg } = await makeRequest({
        type: RequestType.CTL_GPERM,
        uid: chat!,
        usrname: "",
        msg: ""
      })
      return msg as unknown as Record<number, Record<string, boolean>>
    },
    enabled: chat != null
  })
  const permissionOriginal = permissionRawData?.[uid]
  const queryClient = useQueryClient()
  const [permissions, setPermissions] = useState({
    kick: false,
    rename: false,
    invite: false,
    modify_permission: false,
    send: true,
    create_sub_chat: false,
    create_session: true,
    banned: false
  })
  function setPermission(key: PermissionKey) {
    return function (value: boolean) {
      setPermissions({
        ...permissions,
        [key]: value
      })
    }
  }
  function makeModifyPermissionRequest(name: PermissionKey) {
    const value = permissions[name]
    if (permissionOriginal != undefined && permissionOriginal[name] == value) {
      return Promise.resolve({
        uid: 1,
        type: RequestType.CTL_MPERM,
        usrname: "",
        msg: ""
      })
    }
    const request = makeRequest({
      type: RequestType.CTL_MPERM,
      msg: {
        "chat_id": chat,
        "modified_user_id": uid,
        "name": name,
        "value": value
      } as any
    })
    return request
  }
  useEffect(() => {
    if (!permissionOriginal) return
    setPermissions(permissionOriginal as any)
  }, [permissionOriginal])
  return (
    <>
      {createPortal(
        <>
          <input type="checkbox" id={modifyPermissionDialogID} className="modal-toggle" />
          <div className="modal">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Modify permission</h3>
              <p className="py-4">Modify permission of {username}.</p>
              <div className="flex flex-col">
                {allPermissions.map(key => (
                  <SettingsEditItem
                    checked={permissions[key]}
                    setChecked={setPermission(key)}
                    label={permissionKeyToName(key)}
                    key={key}
                  />
                ))}
              </div>
              <div className="modal-action">
                <label htmlFor={modifyPermissionDialogID} className="btn">Close</label>
                <button className="btn" onClick={async () => {
                  const result = await Promise.all(
                    allPermissions.map(makeModifyPermissionRequest)
                  )
                  queryClient.invalidateQueries({
                    queryKey: ["user-permission", chat]
                  })
                  const success = result
                    .map(req => !!req.uid)
                    .reduce((a, b) => a && b)
                  if (success) {
                    successAlert("Permission has successfully been modified.")
                  } else {
                    errorAlert("Permission denied.")
                  }
                }} disabled={
                  permissionOriginal == undefined || (
                    allPermissions
                      .map((a) => permissionOriginal[a] == permissions[a])
                      .reduce((a,b) => a && b)
                  )
                }>Change permission</button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )

}