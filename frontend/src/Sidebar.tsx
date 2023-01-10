import { ReactNode, useState, useEffect, useCallback, DragEvent, Fragment, useMemo, MouseEvent } from "react"
import localforage from "localforage"
import { useNavigate, useFetcher, FetcherWithComponents } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import classNames from "classnames"

import {
  AppBar,
  Typography,
  Toolbar,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Tooltip,
  Menu,
  MenuItem,
  useMediaQuery,
  ListItemAvatar,
  Avatar,
  Badge
} from "@mui/material"
import { useTheme } from "@mui/material/styles"

import {
  GroupAddOutlined as GroupAddOutlinedIcon,
  AddCircleOutlineOutlined as AddCircleOutlineOutlinedIcon,
  AccountCircle,
  Menu as MenuIcon,
  Tune as TuneIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  MoreHoriz as MoreHorizIcon,
  People as PeopleIcon,
  Close as CloseIcon
} from "@mui/icons-material"

import { useSelector, useDispatch } from "./store"
import { RequestType, MESSAGE_MIME_TYPE, Request } from "./config"
import { ToolbarDialog, CreateChatDialog, EditPermissionDialog as ModifyPermissionDialog } from "./Toolbar"
import { stringToColor, useChatList, useNetwork } from "./tools"
import { changeName, changeValue, changeSession } from "./state/chat"

export function NavBar({ toggle, toggleRightSidebar }: {
  toggle: () => void
  toggleRightSidebar: () => void
}) {
  const chatName = useSelector(state => state.chat.name)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const session = useSelector(state => state.chat.session)
  const menuOpen = !!anchorEl
  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={toggle}
          className="mr-0.5"
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" className="ml-2 flex-1">
          {session ?? chatName}
        </Typography>
        <IconButton 
          size="large"
          aria-haspopup="true"
          onClick={event => {
            setAnchorEl(event.currentTarget)
          }}
          color="inherit"
        >
          <AccountCircle />
        </IconButton>
        {session == null && <IconButton 
          size="large"
          aria-haspopup="true"
          onClick={toggleRightSidebar}
          color="inherit"
        >
          <PeopleIcon />
        </IconButton>}
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => {
            toggleRightSidebar()
          }}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
        >
          <MenuItem onClick={() => {
            (async () => {
              await localforage.removeItem("token")
              // dispatch(reset())
              setAnchorEl(null)
              // TODO: backend doesn't provide an api for changing account, 
              // So refreshing and make new websocket connection is required
              // Change the behavior later
              location.href = "/login"
            })()
          }}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}

function sendMessage(fetcher: FetcherWithComponents<any>, chat: number, msg: string, session: string | null) {
  fetcher.submit({ msg, session: session ?? "" }, {
    method: "post",
    action: `/chats/${chat}/?index`
  })
}

function dragOverHandler(ev: DragEvent<HTMLLIElement>) {
  ev.preventDefault()
  ev.dataTransfer.dropEffect = "copy"
}

function dropHandler(fetcher: FetcherWithComponents<any>, chat: number, session: string | null) {
  return function (ev: DragEvent<HTMLLIElement>) {
    ev.preventDefault()
    const { msg } = JSON.parse(ev.dataTransfer.getData(MESSAGE_MIME_TYPE))
    sendMessage(fetcher, chat, msg, session)
  }
}

function SubChatSidebarItem({ chat, clickHandler, settingsClickHandler, setOpen }: {
  chat: number
  setOpen: (value: boolean) => void
  clickHandler: (value: number, name: string, session: string | null) => void
  settingsClickHandler: (value: number, name: string) => () => void
}) {
  const chatValue = useSelector(state => state.chat.value)
  const { values: chatValues, names: chatNames } = useChatList()
  const sessions = useSelector(state => state.chat.sessions)
    .filter(([id, session]) => id == chat)
    .map(([chat, session]) => session)
  const currentSession = useSelector(state => state.chat.session)
  const fetcher = useFetcher()
  const [fold, setFold] = useState(true)
  return (
    <>
      <ListItem className="indent-4" disablePadding secondaryAction={
        <>
          {!!sessions.length && (
            <IconButton onClick={() => {
              setFold(!fold)
            }}>
              {fold ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          )}
          <IconButton edge="end" onClick={settingsClickHandler(chat, chatNames[chatValues.indexOf(chat)])}>
            <TuneIcon />
          </IconButton>
        </>
      } onDragOver={dragOverHandler} onDrop={dropHandler(fetcher, chat, null)}>
        <Tooltip title={`id: ${chat}`}>
          <ListItemButton onClick={() => {
            setOpen(false)
            clickHandler(chat, chatNames[chatValues.indexOf(chat)], null)
          }} selected={chat === chatValue && currentSession == null}>
            <ListItemText primary={chatNames[chatValues.indexOf(chat)]} />
          </ListItemButton>
        </Tooltip>
      </ListItem>
      {!!sessions.length && !fold && sessions.map(session => (
        <ListItem className="indent-8" disablePadding key={session} onDragOver={dragOverHandler} onDrop={dropHandler(fetcher, chat, session)}>
          <ListItemButton onClick={() => {
            setOpen(false)
            clickHandler(chat, chatNames[chatValues.indexOf(chat)], session)
          }} selected={chat === chatValue && currentSession == session}>
            <ListItemText primary={session} />
          </ListItemButton>
        </ListItem>
      ))}
    </>
  )

}

function SidebarItem({ value, setOpen, subChats }: {
  value: number
  setOpen: (value: boolean) => void
  subChats: number[]
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const chatValue = useSelector(state => state.chat.value)
  const { values: chatValues, names: chatNames } = useChatList()
  const session = useSelector(state => state.chat.session)
  const [fold, setFold] = useState(true)
  const fetcher = useFetcher()
  const clickHandler = useCallback((value: number, name: string, session: string | null = null) => {
    dispatch(changeValue(value))
    dispatch(changeName(name))
    dispatch(changeSession(session))
    navigate(`/chats/${value}`)
  }, [])
  const settingsClickHandler = useCallback((value: number, name: string) => {
    return function () {
      dispatch(changeValue(value))
      dispatch(changeName(name))
      navigate(`/chats/${value}/settings/null`)
      setOpen(false)
    }
  }, [])
  return (
    <>
      <ListItem disablePadding secondaryAction={
        <>
          {!!subChats.length && (
            <IconButton onClick={() => {
              setFold(!fold)
            }}>
              {fold ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          )}
          <IconButton edge="end" onClick={settingsClickHandler(value, chatNames[chatValues.indexOf(value)])}>
            <TuneIcon />
          </IconButton>
        </>
      } onDragOver={dragOverHandler} onDrop={dropHandler(fetcher, value, null)}>
        <Tooltip title={`id: ${value}`}>
          <ListItemButton onClick={() => {
            setOpen(false)
            clickHandler(value, chatNames[chatValues.indexOf(value)])
          }} selected={value === chatValue}>
            <ListItemText primary={chatNames[chatValues.indexOf(value)]} />
          </ListItemButton> 
        </Tooltip>
      </ListItem>
      {!fold && subChats.map(chat => (
        <SubChatSidebarItem
          key={chat}
          chat={chat}
          setOpen={setOpen}
          clickHandler={clickHandler}
          settingsClickHandler={settingsClickHandler}
        />
      ))}
    </>
  )
}

export function Sidebar({ open, setOpen }: {
  open: boolean,
  setOpen: (value: boolean) => void
}) {
  const dispatch = useDispatch()
  const { successAlert, errorAlert } = useNetwork()
  const { refresh: refreshChats, parentChats } = useChatList()
  const theme = useTheme()

  const [joinChatDialogOpen, setJoinChatDialogOpen] = useState(false)
  const [createChatDialogOpen, setCreateChatDialogOpen] = useState(false)

  const afterJoinHandler = useCallback((chat: number, req: Request) => {
    if (req.uid) {
      dispatch(changeName(req.usrname))
      successAlert("You have joined the chat successfully. ")
      dispatch(changeValue(chat))
      refreshChats()
    } else {
      errorAlert("No such chat. ")
    }
  }, [dispatch, successAlert, errorAlert, refreshChats, dispatch])

  const listCreateItemButtonClickHandler = useCallback(() => {
    setCreateChatDialogOpen(true)
    setOpen(false)
  }, [setCreateChatDialogOpen, setOpen])

  const listJoinItemButtonClickHandler = useCallback(() => {
    setJoinChatDialogOpen(true)
    setOpen(false)
  }, [setCreateChatDialogOpen, setOpen])

  const sidebarItems = useMemo(() => Object.entries<number[]>(parentChats).map(value => (
    <SidebarItem
      value={Number(value[0])}
      setOpen={setOpen}
      subChats={value[1]}
      key={value[0]}
    />
  )), [parentChats, setOpen])
  
  return (
    <>
      <ToolbarDialog
        afterJoin={afterJoinHandler} 
        typeNumber={RequestType.CTL_JOINS}
        typeString="join"
        open={joinChatDialogOpen}
        setOpen={setJoinChatDialogOpen}
      />
      <CreateChatDialog open={createChatDialogOpen} setOpen={setCreateChatDialogOpen} />
      <div 
        aria-hidden={!open} 
        className={classNames("duration-300 overflow-x-hidden w-full transition-all no-scrollbar", {
          "sm:max-w-xs max-w-full sm:w-xs w-full overflow-y-auto": open,
          "max-w-0 overflow-y-hidden": !open
        })}
      >
        <List subheader={
          <ListSubheader component="div">
            Actions
          </ListSubheader>
        }>
          <ListItem disablePadding>
            <ListItemButton onClick={listCreateItemButtonClickHandler}>
              <ListItemIcon>
                <AddCircleOutlineOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Create chat" />
            </ListItemButton> 
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={listJoinItemButtonClickHandler}>
              <ListItemIcon>
                <GroupAddOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Join chat" />
            </ListItemButton> 
          </ListItem>
        </List>
        <Divider />
        <List subheader={
          <ListSubheader component="div">
            Chat
          </ListSubheader>
        }>
          {sidebarItems}
        </List>
        <Divider />
      </div>
    </>
  )
}

function UserItem({ name, id, online, setAnchorEl, setHandleUsername, setHandleUserID, first }: {
  name: string
  id: number
  online: boolean
  setAnchorEl: (value: HTMLElement | null) => void
  setHandleUsername: (value: string) => void
  setHandleUserID: (value: number) => void
  first: boolean
}) {
  const characters = name.split(" ")
  const letter1 = (characters[0]?.[0] ?? "").toUpperCase()
  const letter2 = (characters[1]?.[0] ?? "").toUpperCase()
  // const Badge = online ? OnlineBadge : OfflineBadge
  const centerIconButtonClickHandler = useCallback((ev: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(ev.currentTarget)
    setHandleUsername(name)
    setHandleUserID(id)
  }, [name, id, setAnchorEl, setHandleUsername, setHandleUserID])
  return (
    <>
      {!first && <Divider />}
      <ListItem alignItems="flex-start">
        <ListItemAvatar>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
            classes={{
              badge: online ? "bg-green-400 text-green-400" : "bg-gray-300 text-gray-300"
            }}
          >
            <Avatar className="w-9 h-9 text-lg" style={{
              backgroundColor: stringToColor(name)
            }}>{letter1}{letter2}</Avatar>
          </Badge>
        </ListItemAvatar>
        <ListItemText
          primary={name}
          secondary={
            <Typography
              component="span"
              variant="body2"
              color={online ? "text.primary" : "text.secondary"}
            >
              {online ? "Online" : "Offline"}
            </Typography>
          }
        />
        <IconButton onClick={centerIconButtonClickHandler} className="my-auto">
          <MoreHorizIcon />
        </IconButton>
      </ListItem>
    </>
  )
}

export function UsersSidebar({ open, setOpen }: {
  open: boolean
  setOpen: (value: boolean) => void
}) {
  const chat = useSelector(state => state.chat.value)
  const small = useMediaQuery(useTheme().breakpoints.down("sm"))
  useMediaQuery(useTheme().breakpoints.down("sm"))
  const { makeRequest, successAlert, errorAlert } = useNetwork()
  const { refresh: refreshChats, values: chatValues, loading: chatValuesLoading } = useChatList()
  const navigate = useNavigate()
  useEffect(() => {
    if (!chatValuesLoading && chat != null && !chatValues.includes(chat)) {
      navigate("/chats/empty")
    }
  }, [chat, chatValues])
  const queryClient = useQueryClient()
  const { data: usersData } = useQuery({
    queryKey: ["user-list", chat],
    queryFn: async () => {
      if (chat == null) return []
      console.log({ chat })
      const { msg } = await makeRequest({
        type: RequestType.CTL_USERS,
        uid: chat!
      })
      return msg as unknown as [number, string][]
    },
    enabled: chat != null
  })
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
  const { data: onlineData } = useQuery({
    queryKey: ["is-online", usersData],
    queryFn: async () => {
      if (chat == null || usersData == null || !usersData.length) return []
      const { msg } = await makeRequest({
        type: RequestType.CTL_ISONL,
        msg: usersData!.map(a => a[0]) as any
      })
      return msg as unknown as boolean[]
    },
    enabled: chat != null && usersData != null && !usersData.length
  })
  const users: [string, number, boolean][] = useMemo(() => {
    if (onlineData === undefined) {
     return usersData?.map?.(([id, name]) => [name, id, false]) ?? []
    } else {
      return usersData?.map?.(([id, name], index) => [name, id, onlineData[index]]) ?? []
    }
  }, [usersData, onlineData])

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const menuOpen = Boolean(anchorEl)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [handleUsername, setHandleUsername] = useState("")
  const [handleUserID, setHandleUserID] = useState(0)

  const handleClose = useCallback(() => {
    setAnchorEl(null)
  }, [])

  const handleModifyPermissionButtonClick = useCallback(() => {
    setDialogOpen(true)
    setAnchorEl(null)
  }, [])

  const handleKickButtonClick = useCallback(async () => {
    setAnchorEl(null)
    if (chat == undefined) return
    const { uid } = await makeRequest({
      type: RequestType.CTL_KICK,
      uid: chat,
      msg: handleUserID as any
    })
    if (uid) {
      successAlert("User has been kicked.")
      refreshChats()
      queryClient.invalidateQueries({ queryKey: ["user-list", chat] })
    } else {
      errorAlert("Permission denied.")
    }
  }, [chat, handleUserID])

  const handleBanButtonClick = useCallback(async () => {
    const ban = !permissionRawData?.[handleUserID]?.banned
    const { uid } = await window.makeRequest({
      type: RequestType.CTL_MPERM,
      msg: {
        "chat_id": chat,
        "modified_user_id": handleUserID,
        "name": "banned",
        "value": ban
      } as any
    })
    if (uid) {
      successAlert(ban ? "User has been successfully banned." : "User has been successfully unbanned.")
      refreshChats()
      queryClient.invalidateQueries({ queryKey: ["user-list", chat] })
    } else {
      errorAlert("Permission denied.")
    }
  }, [handleUserID])

  return (
    <div className={classNames("w-full overflow-x-hidden flex transition-all duration-300 no-scrollbar bg-white", {
      "max-w-full sm:max-w-xs w-full sm:w-xs overflow-y-auto": open,
      "max-w-0 overflow-y-hidden": !open
    })}>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleClose}
      >
        <MenuItem onClick={handleKickButtonClick}>Kick</MenuItem>
        <MenuItem onClick={handleBanButtonClick}>{permissionRawData?.[handleUserID]?.banned ? "Unban" : "Ban"}</MenuItem>
        <MenuItem onClick={handleModifyPermissionButtonClick}>Modify Permission</MenuItem>
      </Menu>
      <ModifyPermissionDialog open={dialogOpen} setOpen={setDialogOpen} uid={handleUserID} username={handleUsername} />
      <List className="flex-1">
        {small && (
          <IconButton onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        )}
        {users.map((user, index) => {
          const [name, id, online] = user
          return (
            <UserItem
              name={name}
              id={id}
              online={online}
              setAnchorEl={setAnchorEl}
              setHandleUsername={setHandleUsername}
              setHandleUserID={setHandleUserID}
              key={id}
              first={!index}
            />
          )
        })}
      </List>
    </div>
  )
}

export function MainLayout({ children }: {
  children: ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const small = useMediaQuery(useTheme().breakpoints.down("sm"))
  const session = useSelector(state => state.chat.session)
  const toggleCallback = useCallback(() => setSidebarOpen(!sidebarOpen), [setSidebarOpen, sidebarOpen])
  const toggleRightCallback = useCallback(() => setRightSidebarOpen(!rightSidebarOpen), [setRightSidebarOpen, rightSidebarOpen])
  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className={classNames("flex flex-col flex-1 transition-all duration-300 overflow-x-hidden", small && rightSidebarOpen ? "w-0" : sidebarOpen ? "w-auto" : "w-full")}>
        <NavBar 
          toggle={toggleCallback}
          toggleRightSidebar={toggleRightCallback}
        />
        {children}
      </div>
      {session == null && <UsersSidebar open={rightSidebarOpen} setOpen={setRightSidebarOpen} />}
    </div>
  )
}