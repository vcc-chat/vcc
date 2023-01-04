import { useEffect, useState, memo, Fragment } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { ListItem, ListItemText, IconButton, Button } from '@mui/material'
import {
  Delete as DeleteIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon
} from "@mui/icons-material"

import { RequestType } from "../config"
import { useSelector } from "../store"
import { useChatList, useNetwork } from "../tools"
import { useSettingsUsersLoaderData } from "../loaders"
import {
  SettingsList,
  SettingsGroup,
  SettingsEditItem,
  allPermissions,
  PermissionKey,
  permissionKeyToName,
} from "../Settings"


function SettingsEdit({ id, permission }: {
  id: number,
  permission: Record<PermissionKey, boolean>
}) {
  const chat = useSelector(state => state.chat.value)
  const queryClient = useQueryClient()
  const [permissions, setPermissions] = useState({
    kick: false,
    rename: false,
    invite: false,
    modify_permission: false,
    send: true,
    create_sub_chat: false,
    create_session: true
  })
  function setPermission(key: PermissionKey) {
    return function (value: boolean) {
      setPermissions({
        ...permissions,
        [key]: value
      })
    }
  }
  const { makeRequest, successAlert, errorAlert } = useNetwork()
  function makeModifyPermissionRequest(name: PermissionKey) {
    const value = permissions[name]
    if (permission[name] == value) {
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
        "modified_user_id": id,
        "name": name,
        "value": value
      } as any
    })
    queryClient.invalidateQueries({
      queryKey: ["user-permission", chat]
    })
    return request
  }
  useEffect(() => {
    if (!permission) return
    setPermissions(permission)
  }, [permission])
  return (
    <SettingsGroup>
      {allPermissions.map(key => (
        <SettingsEditItem
          checked={permissions[key]}
          setChecked={setPermission(key)}
          label={permissionKeyToName(key)}
          key={key}
        />
      ))}
      <Button onClick={async () => {
        const result = await Promise.all(
          allPermissions.map(makeModifyPermissionRequest)
        )
        const success = result
          .map(req => !!req.uid)
          .reduce((a, b) => a && b)
        if (success) {
          successAlert("Permission has successfully been modified.")
        } else {
          errorAlert("Permission denied.")
        }
      }} disabled={
        allPermissions
          .map((a) => permission[a] == permissions[a])
          .reduce((a,b) => a && b)
      }>
        Change permission
      </Button>
    </SettingsGroup>
  )
}

export default memo(function SettingsUsers(props: {}) {
  const chat = useSelector(state => state.chat.value)
  const chatName = useSelector(state => state.chat.name)
  const username = useSelector(state => state.username.value)
  const { makeRequest, successAlert, errorAlert } = useNetwork()
  const { refresh: refreshChats } = useChatList()
  const [showID, setShowID] = useState<number | null>(null)

  const [users, setUsers] = useState<[number, string][]>([])
  const queryClient = useQueryClient()

  const { users: usersRaw, permission } = useSettingsUsersLoaderData()
  if (chat == null || chatName == null) {
    return (
      <div />
    )
  }

  useEffect(() => {
    if (chatName == null) return
    setUsers(usersRaw)
  }, [])

  return (
    <SettingsList>
      {(users.length ? users : usersRaw).map(([id, name], index) => (
        <Fragment key={id}>
          <ListItem secondaryAction={
            <>
              <IconButton edge="end" onClick={async () => {
                setShowID(showID == index ? null : index)
              }}>
                {showID == index ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
              {name != username && (
                <IconButton edge="end" onClick={async () => {
                  const { uid } = await makeRequest({
                    type: RequestType.CTL_KICK,
                    uid: chat,
                    msg: id as any
                  })
                  if (uid) {
                    successAlert("User has been kicked.")
                  } else {
                    errorAlert("Permission denied.")
                  }
                  refreshChats()
                  const request = await makeRequest({
                    type: RequestType.CTL_USERS,
                    uid: chat
                  })
                  queryClient.invalidateQueries({
                    queryKey: ["user-list", chat]
                  })
                  setUsers(request.msg as any)
                }}>
                  <DeleteIcon />
                </IconButton>
              )}
            </>
          }>
            <ListItemText
              primary={name}
              secondary={`id: ${id}`}
            />
          </ListItem>
          {showID == index && (
            <ListItem>
              <SettingsEdit id={id} permission={permission[id]} />
            </ListItem>
          )}
        </Fragment>
      ))}
    </SettingsList>
  )
})
