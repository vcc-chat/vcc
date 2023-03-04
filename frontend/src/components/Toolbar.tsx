import { useState, useEffect, useCallback } from "preact/hooks"
import { type TargetedEvent, createPortal } from "preact/compat"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import useStore from "../store"
import { Request, RequestType } from "../config"
import { useChatList, useNetwork } from "../tools"
import {
  SettingsEditItem,
  allPermissions,
  PermissionKey
} from "./Settings"
import { Trans, useTranslation } from "react-i18next"

export function JoinDialog({ id }: {
  id: string
}) {
  const [dialogValue, setDialogValue] = useState("")
  const { makeRequest } = useNetwork()
  const { t } = useTranslation()

  const changeValue = useStore(state => state.changeChat)
  const changeName = useStore(state => state.changeChatName)
  const navigate = useNavigate()
  const { successAlert, errorAlert } = useNetwork()
  const { refetch } = useChatList()

  const joinHandler = useCallback(async () => {
    let chat: number
    try {
      chat = parseInt(dialogValue)
    } catch (e) {
      return
    }
    if (chat === null) return
    const request = await makeRequest({
      uid: chat,
      type: "chat_join"
    })
    if (request.uid) {
      await refetch()
      navigate(`/chats/${request.uid}`)
      successAlert(t("You have joined the chat successfully. "))
    } else {
      errorAlert(t("No such chat. "))
    }
  }, [successAlert, errorAlert, refetch, dialogValue])
  return createPortal((
    <>
      <input type="checkbox" id={id} className="modal-toggle" />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("Join chat")}</h3>
          <p className="py-4">{t("Enter the chat number you want to join")}.</p>
          <input className="input" autoFocus placeholder={t("Chat id") ?? ""} value={dialogValue} onInput={(ev: TargetedEvent<HTMLInputElement, Event>) => setDialogValue(ev.currentTarget.value)} />
          <div className="modal-action">
            <label htmlFor={id} className="btn">{t("Close")}</label>
            <button className="btn" onClick={joinHandler}>{t("Join")}</button>
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
        type: "chat_get_all_permission",
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
  const { t } = useTranslation()
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
        type: "chat_modify_user_permission" as const,
        usrname: "",
        msg: ""
      })
    }
    const request = makeRequest({
      type: "chat_modify_user_permission" as const,
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
              <h3 className="font-bold text-lg">{t("Modify permission")}</h3>
              <p className="py-4">
                <Trans i18nKey="modify-permission-dialog-description">Modify permission of {{username}}.</Trans>
              </p>
              <div className="flex flex-col">
                {allPermissions.map(key => (
                  <SettingsEditItem
                    checked={permissions[key]}
                    setChecked={setPermission(key)}
                    label={t(key)}
                    key={key}
                  />
                ))}
              </div>
              <div className="modal-action">
                <label htmlFor={modifyPermissionDialogID} className="btn">{t("Close")}</label>
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
                    successAlert(t("Permission has successfully been modified."))
                  } else {
                    errorAlert(t("Permission denied."))
                  }
                }} disabled={
                  permissionOriginal == undefined || (
                    allPermissions
                      .map((a) => permissionOriginal[a] == permissions[a])
                      .reduce((a,b) => a && b)
                  )
                }>{t("Apply")}</button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )

}