
import { useState, useEffect } from "react"
import {
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Button,
  Autocomplete
} from "@mui/material"
import { GroupRemoveOutlined as GroupRemoveOutlinedIcon } from "@mui/icons-material"
import { useQueryClient, useQuery } from "@tanstack/react-query"


import { Request, RequestType } from "./config"
import { useDispatch, useSelector } from "./store"
import { changeValue as changeChat, addSession } from "./state/chat"
import { LoginType } from "./state/login"
import { useChatList, useNetwork } from "./tools"
import {
  SettingsEditItem,
  allPermissions,
  PermissionKey,
  permissionKeyToName,
} from "./Settings"

export function ToolbarDialog({ afterJoin, typeNumber, typeString, open, setOpen }: {
  afterJoin: (arg0: number, req: Request) => void,
  typeNumber: RequestType,
  typeString: string,
  open: boolean,
  setOpen: (arg0: boolean) => void
}) {
  const [dialogValue, setDialogValue] = useState("")
  const title = typeString[0].toUpperCase() + typeString.slice(1)
  const { makeRequest } = useNetwork()
  return (
    <Dialog open={open}>
      <DialogTitle>{title} chat</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter the chat number you want to {typeString}.
        </DialogContentText>
        <TextField 
          autoFocus 
          label="Chat id" 
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }} 
          margin="dense" 
          value={dialogValue} 
          onChange={ev => setDialogValue(ev.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>close</Button>
        <Button onClick={async () => {
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
          setOpen(false)
          afterJoin(chat, request)
        }}>{typeString}</Button>
      </DialogActions>
    </Dialog>
  )
}

export function CreateChatDialog({ open, setOpen }: {
  open: boolean
  setOpen: (arg0: boolean) => void
}) {
  const [chatName, setChatName] = useState("")
  const { refresh: refreshChats, names: chatNames, values: chatValues, parentChats } = useChatList()
  const dispatch = useDispatch()
  const { makeRequest, successAlert, errorAlert } = useNetwork()
  const [parentChat, setParentChat] = useState(-1)
  const [isCreateChat, setIsCreateChat] = useState(true)
  return (
    <Dialog open={open} css={{ overflow: "visible" }}>
      <DialogTitle>Create {isCreateChat ? "chat" : "session"}</DialogTitle>
      <DialogContent css={{ overflow: "visible" }}>
        <DialogContentText>
          Enter the name of the {isCreateChat ? "chat" : "session"} you want to create and choose its parent chat.
        </DialogContentText>
        <div className="flex flex-col">
          <TextField 
            autoFocus 
            label={isCreateChat ? "Chat name" : "Session name"} 
            margin="dense" 
            value={chatName} 
            onChange={ev => setChatName(ev.target.value)}
          />
          <Autocomplete
            value={parentChat == -1 ? null : {
              id: parentChat,
              label: chatNames[chatValues.indexOf(Number(parentChat))],
              isCreateChat: Object.keys(parentChats).includes(parentChat.toString())
            }}
            onChange={(ev, newValue) => {
              setParentChat(newValue?.id ?? -1)
              setIsCreateChat(newValue?.isCreateChat ?? true)
            }}
            disablePortal
            blurOnSelect
            options={
              Object
                .keys(parentChats)
                .map<[number, boolean]>(a => [Number(a), true])
                .concat(
                  Object
                    .values(parentChats)
                    .reduce((a, b) => a.concat(b), [])
                    .map(a => [a, false])
                )
                .map(([chat, isParent]) => ({
                  label: chatNames[chatValues.indexOf(chat)],
                  id: chat,
                  isCreateChat: isParent
                }))
            }
            groupBy={(option) => option.isCreateChat ? "Parent chat" : "Sub-chat"}
            renderInput={(params) => <TextField {...params} label="Parent chat" />}
            isOptionEqualToValue={(option, value) => (
              option.id == value.id && option.label == value.label
            )}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>close</Button>
        <Button onClick={async () => {
          if (chatName === "") return
          if (isCreateChat) {
            const { uid } = await makeRequest({
              type: RequestType.CTL_NEWSE,
              usrname: chatName,
              uid: parentChat
            })
            if (uid) {
              successAlert(`You have created the ${isCreateChat ? "chat" : "session"} successfully. `)
              refreshChats()
            } else {
              errorAlert(`Unexpected error: You haven't created the ${isCreateChat ? "chat" : "session"} successfully. `)
            }
          } else {
            const { uid } = await makeRequest({
              type: RequestType.CTL_JSESS,
              uid: parentChat,
              msg: chatName
            })
            if (uid) {
              successAlert("You have joined the session successfully. ")
              dispatch(addSession([parentChat, chatName]))
            } else {
              errorAlert("Permission denied. ")
            }
          }
          setOpen(false)
        }}>create</Button>
      </DialogActions>
    </Dialog>
  )
}


export function EditPermissionDialog({ open, setOpen, uid, username }: {
  open: boolean,
  setOpen: (value: boolean) => void,
  uid: number,
  username: string
}) {
  const { makeRequest, successAlert, errorAlert } = useNetwork()
  const chat = useSelector(state => state.chat.value)
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
    <Dialog open={open}>
      <DialogTitle>Modify permission</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Modify permission of {username}.
        </DialogContentText>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>close</Button>
        <Button onClick={async () => {
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
        }>
          Change permission
        </Button>
      </DialogActions>
    </Dialog>
  )

}


export function Toolbar(props: {}) {
  const dispatch = useDispatch()
  const { makeRequest, successAlert, errorAlert } = useNetwork()
  const chat = useSelector(state => state.chat.value)
  const loginStatus = useSelector(state => state.login.type)
  const { refresh: refreshChats, values: chats } = useChatList()
  return (
    <>
      <SpeedDial ariaLabel="toolbar" icon={<SpeedDialIcon />} hidden={loginStatus != LoginType.LOGIN_SUCCESS || chat == null} className="fixed bottom-16 right-4">
        <SpeedDialAction icon={<GroupRemoveOutlinedIcon />} tooltipTitle="quit chat" onClick={async () => {
          if (chat == null) return
          if (chats.length) {
            dispatch(changeChat(chats[0]))
          } else {
            dispatch(changeChat(null))
          }
          const { uid } = await makeRequest({
            uid: chat,
            type: RequestType.CTL_QUITS
          })
          if (uid) {
            successAlert("You have quit the chat successfully. ")
            refreshChats()
          } else {
            errorAlert("Unexpected error: You haven't quit the chat successfully. ")
          }
        }} />
      </SpeedDial>
    </>
  )
}