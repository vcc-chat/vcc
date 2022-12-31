import styled from "styled-components"
import { useEffect, useState, memo, Fragment } from "react"
import { Link } from "react-router-dom"

import Typography from "@mui/material/Typography"
import Divider from "@mui/material/Divider"
import Switch from "@mui/material/Switch"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemText from "@mui/material/ListItemText"
import TextField from "@mui/material/TextField"
import PureButton from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import DeleteIcon from "@mui/icons-material/Delete"
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import FormGroup from "@mui/material/FormGroup"
import FormControlLabel from "@mui/material/FormControlLabel"
import Button from "@mui/material/Button"

import { RequestType } from "../config"
import { useSelector } from "../store"
import { useNetwork } from "../hooks"
import { useSettingsLoaderData } from "../loaders"

const SettingsTitle = styled(Typography)`
  margin-bottom: 0.5em;
`

const SettingsItemText = styled.div`
  margin-bottom: 0.5em;
  font-size: 1.1em;
  & + ${SettingsTitle} {
    margin-top: 0.3em;
  }
`

const SettingsDivider = styled(Divider)`
  margin-bottom: 0.7em;
`

const SettingsRoot = styled.div`
  padding: 2em;
  display: flex;
  flex-direction: column;
  & + ${SettingsTitle} {
    margin-top: 0.3em;
  }
`

const SettingsLink = styled(Link)`
  color: var(--gray-500);
  &:hover {
    color: var(--gray-700);
  }
  word-break: break-all;
`

const SettingsList = styled(List)`
  border: 1px solid var(--gray-200);
  border-radius: 0.2em;
`

const SettingsFormItem = styled.div`
  display: flex;
`

const SettingsButton = styled(PureButton)`
  margin-top: auto;
  margin-bottom: auto;
  margin-right: auto;
  margin-left: 1em;
`

const SettingsGroup = styled(FormGroup)`
  display: flex;
  flex-direction: row;
  gap: 0.5em;
`

const SettingsControlLabel = styled(FormControlLabel)``

function SettingsEditItem({ checked, setChecked, label }: {
  checked: boolean,
  setChecked: (checked: boolean) => void,
  label: string
}) {
  return (
    <SettingsControlLabel 
      control={
        <Switch 
          checked={checked} 
          onChange={ev => setChecked(ev.target.checked)} 
        />
      } 
      label={label} 
    />
  )
}
const allPermissions = ["kick", "rename", "invite", "modify_permission", "send"] as const
type PermissionKey = typeof allPermissions[number]

const allPermissionNames = ["kick", "rename", "invite", "modify permission", "send"] as const
type PermissionName = typeof allPermissionNames[number]

function permissionKeyToName(key: PermissionKey): PermissionName {
  return key == "modify_permission" ? "modify permission" : key
}

function SettingsEdit({ id, permission }: {
  id: number,
  permission: Record<PermissionKey, boolean>
}) {
  const chat = useSelector(state => state.chat.value)
  const [permissions, setPermissions] = useState({
    kick: false,
    rename: false,
    invite: false,
    modify_permission: false,
    send: true
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
    return makeRequest({
      type: RequestType.CTL_MPERM,
      msg: {
        "chat_id": chat,
        "modified_user_id": id,
        "name": name,
        "value": value
      } as any
    })
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

export default memo(function Settings(props: {}) {
  const chat = useSelector(state => state.chat.value)
  const chatName = useSelector(state => state.chat.name)
  const username = useSelector(state => state.username.value)
  const { makeRequest, sendJsonMessage, successAlert, errorAlert } = useNetwork()
  const [renameValue, setRenameValue] = useState("")
  const [showID, setShowID] = useState<number | null>(null)

  const [users, setUsers] = useState<[number, string][]>([])

  const { users: usersRaw, permission, inviteLink } = useSettingsLoaderData()

  useEffect(() => {
    if (chatName == null) return
    setRenameValue(chatName)
    setUsers(usersRaw)
  }, [])

  async function rename() {
    const { uid } = await makeRequest({
      type: RequestType.CTL_RNAME,
      uid: chat!,
      msg: renameValue
    })
    if (uid) {
      successAlert("Chat has renamed.")
    } else {
      errorAlert("Permission denied.")
    }
    sendJsonMessage({
      type: RequestType.CTL_LJOIN,
    })
  }
  if (chat == null || chatName == null) {
    return (
      <div />
    )
  }

  return (
    <SettingsRoot>
      <SettingsTitle variant="h5">Basic Information</SettingsTitle>
      <SettingsDivider />
      <SettingsItemText>Name: {chatName}</SettingsItemText>
      <SettingsItemText>ID: {chat}</SettingsItemText>
      {inviteLink != null && <SettingsItemText>Invite Link: <SettingsLink to={inviteLink}>{location.origin}{inviteLink}</SettingsLink></SettingsItemText>}
      <SettingsTitle variant="h5">Joined users</SettingsTitle>
      <SettingsDivider />
      <SettingsList>
        {users.map(([id, name], index) => (
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
                    sendJsonMessage({
                      type: RequestType.CTL_LJOIN
                    })
                    const request = await makeRequest({
                      type: RequestType.CTL_USERS,
                      uid: chat
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
      <SettingsTitle variant="h5">Actions</SettingsTitle>
      <SettingsDivider />
      <SettingsFormItem>
        <TextField label="Rename" value={renameValue} onChange={ev => {
          setRenameValue(ev.target.value)
        }} />
        <SettingsButton disabled={renameValue == chatName} onClick={rename}>Change</SettingsButton>
      </SettingsFormItem>
    </SettingsRoot>
  )
})
