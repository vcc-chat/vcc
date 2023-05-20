import { useState, useEffect, useCallback, useReducer } from "preact/hooks"
import { type TargetedEvent, createPortal } from "preact/compat"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import useStore from "../store"
import { useChatList, useNetwork } from "../tools"
import { SettingsEditItem, allPermissions, PermissionKey } from "./Settings"
import { Trans, useTranslation } from "react-i18next"

export function JoinDialog({ id }: { id: string }) {
  const [dialogValue, setDialogValue] = useState("")
  const { makeRequest } = useNetwork()
  const { t } = useTranslation()

  const navigate = useNavigate()
  const { successAlert, errorAlert } = useNetwork()
  const { refresh } = useChatList()

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
      await refresh()
      navigate(`/chats/${request.uid}`)
      successAlert(t("You have joined the chat successfully. "))
    } else {
      errorAlert(t("No such chat. "))
    }
  }, [successAlert, errorAlert, refresh, dialogValue])
  return createPortal(
    <>
      <input type="checkbox" id={id} className="modal-toggle" />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("Join chat")}</h3>
          <p className="py-4">{t("Enter the chat number you want to join.")}</p>
          <input
            className="input"
            autoFocus
            placeholder={t("Chat id") ?? ""}
            value={dialogValue}
            onInput={(ev: TargetedEvent<HTMLInputElement, Event>) => setDialogValue(ev.currentTarget.value)}
          />
          <div className="modal-action">
            <label htmlFor={id} className="btn">
              {t("Close")}
            </label>
            <button className="btn" onClick={joinHandler}>
              {t("Join")}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

export function ChangeNickname({ id, uid }: { id: string; uid: number }) {
  const [dialogValue, setDialogValue] = useState("")
  const { makeRequest } = useNetwork()
  const { t } = useTranslation()
  const chat = useStore(state => state.chat)

  const navigate = useNavigate()
  const { successAlert, errorAlert } = useNetwork()
  const queryClient = useQueryClient()

  const changeHandler = useCallback(async () => {
    if (dialogValue === null) return
    const request = await makeRequest({
      msg: chat as unknown as string,
      uid,
      usrname: dialogValue,
      type: "chat_change_nickname"
    })
    if (request.uid) {
      queryClient.invalidateQueries(["get-nickname", uid])
      navigate(`/chats/${request.uid}`)
      successAlert(t("You have changed the nickname successfully. "))
    } else {
      errorAlert(t("Permission denied. "))
    }
  }, [successAlert, errorAlert, dialogValue])
  return createPortal(
    <>
      <input type="checkbox" id={id} className="modal-toggle" />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("Change nickname")}</h3>
          <p className="py-4">{t("Enter the new nickname you want to change.")}</p>
          <input
            className="input"
            autoFocus
            placeholder={t("New nickname") ?? ""}
            value={dialogValue}
            onInput={(ev: TargetedEvent<HTMLInputElement, Event>) => setDialogValue(ev.currentTarget.value)}
          />
          <div className="modal-action">
            <label htmlFor={id} className="btn">
              {t("Close")}
            </label>
            <button className="btn" onClick={changeHandler}>
              {t("Change")}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

export function EditPermissionDialog({
  uid,
  username,
  modifyPermissionDialogID
}: {
  uid: number
  username: string
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
  const [permissions, setPermissions] = useReducer(
    (state, { key, value }: { key: PermissionKey; value: boolean }) => {
      return {
        ...state,
        [key]: value
      }
    },
    {
      kick: false,
      rename: false,
      invite: false,
      modify_permission: false,
      send: true,
      create_sub_chat: false,
      create_session: true,
      banned: false,
      change_nickname: false
    }
  )
  const { t } = useTranslation()
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
        chat_id: chat,
        modified_user_id: uid,
        name: name,
        value: value
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
                <Trans i18nKey="modify-permission-dialog-description">Modify permission of {{ username }}.</Trans>
              </p>
              <div className="flex flex-col">
                {allPermissions.map(key => (
                  <SettingsEditItem
                    checked={permissions[key]}
                    setChecked={checked => setPermissions({ key, value: checked })}
                    label={t(key)}
                    key={key}
                  />
                ))}
              </div>
              <div className="modal-action">
                <label htmlFor={modifyPermissionDialogID} className="btn">
                  {t("Close")}
                </label>
                <button
                  className="btn"
                  onClick={async () => {
                    const result = await Promise.all(allPermissions.map(makeModifyPermissionRequest))
                    queryClient.invalidateQueries({
                      queryKey: ["user-permission", chat]
                    })
                    const success = result.map(req => !!req.uid).reduce((a, b) => a && b)
                    if (success) {
                      successAlert(t("Permission has successfully been modified."))
                    } else {
                      errorAlert(t("Permission denied."))
                    }
                  }}
                  disabled={
                    permissionOriginal == undefined ||
                    allPermissions.map(a => permissionOriginal[a] == permissions[a]).reduce((a, b) => a && b)
                  }
                >
                  {t("Apply")}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
