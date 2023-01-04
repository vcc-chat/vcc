import styled from "@emotion/styled"
import { ReactNode, useState, useEffect, useCallback, DragEvent, Fragment, useMemo, MouseEvent } from "react"
import localforage from "localforage"
import { useNavigate, useFetcher, FetcherWithComponents } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"

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
  MoreHoriz as MoreHorizIcon
} from "@mui/icons-material"

import { useSelector, useDispatch } from "./store"
import { RequestType, MESSAGE_MIME_TYPE } from "./config"
import { ToolbarDialog, CreateChatDialog, EditPermissionDialog as ModifyPermissionDialog } from "./Toolbar"
import { stringToColor, useChatList, useNetwork } from "./tools"
import { changeName, changeValue, changeSession } from "./state/chat"

const RightIconButton = styled(IconButton)`
  margin-left: auto;
  color: white;
`

const PaddingTypography = styled(Typography)`
  padding-right: 0.5em;
` as any

const RightSpaceIconButton = styled(IconButton)`
  margin-right: 0.1em;
`

export function NavBar({ toggle }: {
  toggle: () => void
}) {
  const chatName = useSelector(state => state.chat.name)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const session = useSelector(state => state.chat.session)
  const menuOpen = !!anchorEl
  return (
    <AppBar position="static">
      <Toolbar>
        <RightSpaceIconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={toggle}
        >
          <MenuIcon />
        </RightSpaceIconButton>
        <PaddingTypography variant="h6" component="div">
          {session ?? chatName}
        </PaddingTypography>
        <RightIconButton 
          size="large"
          aria-haspopup="true"
          onClick={event => {
            setAnchorEl(event.currentTarget)
          }}
        >
          <AccountCircle />
        </RightIconButton>
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => {
            setAnchorEl(null)
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

type PropType = {
  open: boolean
  desktop: boolean
}

const SidebarRoot = styled.div`
  max-width: ${({ open, desktop }: PropType) => open ? (desktop ? "14em" : "100vw") : "0"};
  min-width: ${({ open, desktop }: PropType) => !desktop && open ? "100vw" : "0"};
  overflow-y: ${({ open }: PropType) => open ? "auto" : "hidden"};
  overflow-x: hidden;
  width: 100%;
  transition: max-width 0.3s ease, min-width 0.3s ease;
  scrollbar-width: thin;
`

const SubChatListItem = styled(ListItem)`
  text-indent: 1em;
`

const SessionListItem = styled(ListItem)`
  text-indent: 2em;
`

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
      <SubChatListItem disablePadding secondaryAction={
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
      </SubChatListItem>
      {!!sessions.length && !fold && sessions.map(session => (
        <SessionListItem disablePadding key={session} onDragOver={dragOverHandler} onDrop={dropHandler(fetcher, chat, session)}>
          <ListItemButton onClick={() => {
            setOpen(false)
            clickHandler(chat, chatNames[chatValues.indexOf(chat)], session)
          }} selected={chat === chatValue && currentSession == session}>
            <ListItemText primary={session} />
          </ListItemButton>
        </SessionListItem>
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
  const desktop = useMediaQuery(theme.breakpoints.up('sm'))

  const [joinChatDialogOpen, setJoinChatDialogOpen] = useState(false)
  const [createChatDialogOpen, setCreateChatDialogOpen] = useState(false)
  
  return (
    <>
      <ToolbarDialog
        afterJoin={(chat, req) => {
          if (req.uid) {
            dispatch(changeName(req.usrname))
            successAlert("You have joined the chat successfully. ")
            dispatch(changeValue(chat))
            refreshChats()
          } else {
            errorAlert("No such chat. ")
          }
        }} 
        typeNumber={RequestType.CTL_JOINS}
        typeString="join"
        open={joinChatDialogOpen}
        setOpen={setJoinChatDialogOpen}
      />
      <CreateChatDialog open={createChatDialogOpen} setOpen={setCreateChatDialogOpen} />
      <SidebarRoot open={open} aria-hidden={!open} desktop={desktop}>
        <List subheader={
          <ListSubheader component="div">
            Actions
          </ListSubheader>
        }>
          <ListItem disablePadding>
            <ListItemButton onClick={() => {
              setCreateChatDialogOpen(true)
              setOpen(false)
            }}>
              <ListItemIcon>
                <AddCircleOutlineOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Create chat" />
            </ListItemButton> 
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => {
              setJoinChatDialogOpen(true)
              setOpen(false)
            }}>
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
          {Object.entries<number[]>(parentChats).map(value => (
            <SidebarItem
              value={Number(value[0])}
              setOpen={setOpen}
              subChats={value[1]}
              key={value[0]}
            />
          ))}
        </List>
        <Divider />
      </SidebarRoot>
    </>
  )
}

const AvatarColored = styled(Avatar)`
  background-color: ${({ color }: { color: string }) => color};
  width: 36px;
  height: 36px;
  font-size: 1.125rem;
`

const DividerAutoShow = styled(Divider)`
  &:nth-of-type(1) {
    display: none;
  }
`

const UsersSidebarList = styled(List)`
  max-width: 20em;
  min-width: 10em;
`

const OnlineBadge = styled(Badge)`
  & .MuiBadge-badge {
    background-color: #44b700;
    color: #44b700;
  }
`
const OfflineBadge = styled(Badge)`
  & .MuiBadge-badge {
    background-color: var(--gray-300);
    color: var(--gray-300);
  }
`

const CenterIconButton = styled(IconButton)`
  margin-top: auto;
  margin-bottom: auto;
`

export function UsersSidebar() {
  const chat = useSelector(state => state.chat.value)
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
      const { msg } = await makeRequest({
        type: RequestType.CTL_USERS,
        uid: chat!
      })
      return msg as unknown as [number, string][]
    },
    enabled: chat !== null
  })
  const { data: onlineData } = useQuery({
    queryKey: ["is-online", usersData],
    queryFn: async () => {
      console.log(usersData!.map(a => a[0]))
      const { msg } = await makeRequest({
        type: RequestType.CTL_ISONL,
        msg: usersData!.map(a => a[0]) as any
      })
      return msg as unknown as boolean[]
    },
    enabled: usersData !== undefined
  })
  const users: [string, number, boolean][] = (() => {
    if (onlineData === undefined) {
     return usersData?.map(([id, name]) => [name, id, false]) ?? []
    } else {
      return usersData!.map(([id, name], index) => [name, id, onlineData[index]])
    }
  })()

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)
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
    console.log({ chat })
    if (chat == undefined) return
    const { uid } = await makeRequest({
      type: RequestType.CTL_KICK,
      uid: chat,
      msg: handleUserID as any
    })
    if (uid) {
      successAlert("User has been kicked.")
      refreshChats()
      queryClient.invalidateQueries(["user-list", chat])
    } else {
      errorAlert("Permission denied.")
    }
  }, [chat, handleUserID])

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={handleKickButtonClick}>Kick</MenuItem>
        <MenuItem onClick={handleModifyPermissionButtonClick}>Modify Permission</MenuItem>
      </Menu>
      <ModifyPermissionDialog open={dialogOpen} setOpen={setDialogOpen} uid={handleUserID} username={handleUsername} />
      <UsersSidebarList>
        {users.map(user => {
          const [name, id, online] = user
          const characters = name.split(" ")
          const letter1 = (characters[0]?.[0] ?? "").toUpperCase()
          const letter2 = (characters[1]?.[0] ?? "").toUpperCase()
          const Badge = online ? OnlineBadge : OfflineBadge
          return (
            <Fragment key={name}>
              <DividerAutoShow />
              <ListItem alignItems="flex-start">
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                  >
                    <AvatarColored color={stringToColor(name)}>{letter1}{letter2}</AvatarColored>
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
                <IconButton onClick={ev => {
                  setAnchorEl(ev.currentTarget)
                  setHandleUsername(name)
                  setHandleUserID(id)
                }}>
                  <MoreHorizIcon />
                </IconButton>
              </ListItem>
            </Fragment>
          )
        })}
      </UsersSidebarList>
    </>
  )
}

const Root = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`
const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`

export function MainLayout({ children }: {
  children: ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <Root>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <Container>
        <NavBar 
          toggle={() => setSidebarOpen(!sidebarOpen)}
        />
        {children}
      </Container>
      <UsersSidebar />
    </Root>
  )
}