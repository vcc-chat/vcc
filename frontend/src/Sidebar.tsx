import { ReactNode, useState, useEffect, useCallback, DragEvent, Fragment, useMemo, MouseEvent, useId } from "react"
import localforage from "localforage"
import { useNavigate, useFetcher, FetcherWithComponents } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import classNames from "classnames"

import GroupAddIcon from "@material-design-icons/svg/outlined/group_add.svg"
import AddCircleIcon from "@material-design-icons/svg/outlined/add_circle_outline.svg"
import AccountCircle from "@material-design-icons/svg/filled/account_circle.svg"
import MenuIcon from "@material-design-icons/svg/outlined/menu.svg"
import TuneIcon from "@material-design-icons/svg/outlined/tune.svg"
import ExpandMoreIcon from "@material-design-icons/svg/outlined/expand_more.svg"
import ExpandLessIcon from "@material-design-icons/svg/outlined/expand_less.svg"
import MoreHorizIcon from "@material-design-icons/svg/outlined/more_horiz.svg"
import PeopleIcon from "@material-design-icons/svg/outlined/people.svg"
import CloseIcon from "@material-design-icons/svg/outlined/close.svg"

import { useSelector, useDispatch } from "./store"
import { RequestType, MESSAGE_MIME_TYPE, Request } from "./config"
import { ToolbarDialog, EditPermissionDialog as ModifyPermissionDialog } from "./Toolbar"
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
    <div className="navbar bg-base-100">
      <div className="flex-none">
        <button className="btn btn-square btn-ghost" onClick={toggle}>
          <MenuIcon />
        </button>
      </div>
      <div className="flex-1">
        <a className="btn btn-ghost normal-case text-xl">{session ?? chatName}</a>
      </div>
      <div className="flex-none">
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-square btn-ghost">
            <AccountCircle />
          </label>
          <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
            <li><a onClick={async () => {
              await localforage.removeItem("token")
              location.href = "/login"
            }}>Logout</a></li>
          </ul>
        </div>
      </div>
      {session == null && <div className="flex-none">
        <button className="btn btn-square btn-ghost inline-flex" onClick={toggleRightSidebar}>
          <PeopleIcon />
        </button>
      </div>}
    </div>
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
      <li className="py-1 px-2 flex w-full btn-group">
        <button className={classNames("flex flex-1 btn font-normal normal-case", (chatValue == chat && currentSession == null) ? "btn-accent" : "btn-ghost")} onClick={() => {
            setOpen(false)
            clickHandler(chat, chatNames[chatValues.indexOf(chat)], null)
        }}>
          <div className="ml-2 text-base my-auto mr-auto">{chatNames[chatValues.indexOf(chat)]}</div>
        </button> 
        {!!sessions.length && (
          <button className="btn btn-secondary" onClick={() => {
            setFold(!fold)
          }}>
            {fold ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </button>
        )}
        <button className="btn btn-primary" onClick={settingsClickHandler(chat, chatNames[chatValues.indexOf(chat)])}>
          <TuneIcon />
        </button>
      </li>
      {!!sessions.length && !fold && sessions.map(session => (
        <li className="py-1 px-2 flex w-full btn-group" key={session}>
          <button className={classNames("flex flex-1 btn font-normal normal-case", (chatValue == chat && session == currentSession) ? "btn-accent" : "btn-ghost")} onClick={() => {
            setOpen(false)
            clickHandler(chat, chatNames[chatValues.indexOf(chat)], session)
          }}>
            <div className="ml-4 text-base my-auto mr-auto">{session}</div>
          </button>
        </li>
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
      <li className="py-1 px-2 flex w-full btn-group">
        <button className={classNames("flex flex-1 btn font-normal normal-case", chatValue == value ? "btn-accent" : "btn-ghost")} onClick={() => {
          setOpen(false)
          clickHandler(value, chatNames[chatValues.indexOf(value)])
        }}>
          <div className="text-base my-auto mr-auto">{chatNames[chatValues.indexOf(value)]}</div>
        </button> 
        <button className={classNames("btn btn-secondary", {
          hidden: !subChats.length
        })} onClick={() => {
          setFold(!fold)
        }}>
          {fold ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </button>
        <button className="btn btn-primary" onClick={settingsClickHandler(value, chatNames[chatValues.indexOf(value)])}>
          <TuneIcon />
        </button>
      </li>
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
  const navigate = useNavigate()
  const { successAlert, errorAlert } = useNetwork()
  const { refresh: refreshChats, parentChats } = useChatList()

  const [joinChatDialogOpen, setJoinChatDialogOpen] = useState(false)

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
    navigate("/chats/create")
  }, [])

  const listJoinItemButtonClickHandler = useCallback(() => {
    setJoinChatDialogOpen(true)
    setOpen(false)
  }, [setJoinChatDialogOpen, setOpen])

  const sidebarItems = useMemo(() => Object.entries<number[]>(parentChats).map(value => (
    <SidebarItem
      value={Number(value[0])}
      setOpen={setOpen}
      subChats={value[1]}
      key={value[0]}
    />
  )), [parentChats, setOpen])

  const joinChatDialogID = useId()
  
  return (
    <>
      <ToolbarDialog
        afterJoin={afterJoinHandler} 
        typeNumber={RequestType.CTL_JOINS}
        typeString="join"
        open={joinChatDialogOpen}
        setOpen={setJoinChatDialogOpen}
        id={joinChatDialogID}
      />
      <div 
        aria-hidden={!open} 
        className={classNames("duration-300 overflow-x-hidden w-full transition-all no-scrollbar", {
          "sm:max-w-xs max-w-full sm:w-xs w-full overflow-y-auto": open,
          "max-w-0 overflow-y-hidden": !open
        })}
      >
      <ul className="flex flex-col">
        <div className="opacity-80 text-sm m-4">Actions</div>
        <li className="mx-2 py-2 px-4 flex btn btn-ghost font-normal normal-case">
          <button className="flex flex-1" onClick={listCreateItemButtonClickHandler}>
            <div className="my-auto opacity-60">
              <AddCircleIcon />
            </div>
            <div className="ml-8 text-base">Create Chat</div>
          </button> 
        </li>
        <label htmlFor={joinChatDialogID} className="mx-2 py-2 px-4 flex btn btn-ghost font-normal normal-case">
          <div className="flex flex-1">
            <div className="my-auto opacity-60">
              <GroupAddIcon />
            </div>
            <div className="ml-8 text-base">Join Chat</div>
          </div> 
        </label>
      </ul>
      <div className="divider my-0" />
      <ul className="flex flex-col">
        <div className="opacity-80 text-sm m-4">Chat</div>
        {sidebarItems}
      </ul>
      </div>
    </>
  )
}

function UserItem({ name, id, online, setHandleUsername, setHandleUserID, first, menu }: {
  name: string
  id: number
  online: boolean
  setHandleUsername: (value: string) => void
  setHandleUserID: (value: number) => void
  first: boolean
  menu: ReactNode
}) {
  const characters = name.split(" ")
  const letter1 = (characters[0]?.[0] ?? "").toUpperCase()
  const letter2 = (characters[1]?.[0] ?? "").toUpperCase()
  // const Badge = online ? OnlineBadge : OfflineBadge
  const [show, setShow] = useState(false)
  const centerIconButtonClickHandler = useCallback((ev: MouseEvent<HTMLButtonElement>) => {
    setShow(!show)
    setHandleUsername(name)
    setHandleUserID(id)
  }, [show, name, id])
  return (
    <>
      {!first && <div className="divider my-0" />}
      <li className="flex items-start py-2 px-6 my-1">
        <div className={classNames("avatar placeholder text-lg mr-4", online ? "online" : "offline")}>
          <div className="rounded-full w-10 h-10" style={{
            backgroundColor: stringToColor(name)
          }}>
            <span className="text-white">
              {letter1}{letter2}
            </span>
          </div>
        </div>
        <div className="flex flex-col flex-1">
          <div>{name}</div>
          <span className="opacity-50 text-sm mt-1">{online ? "Online" : "Offline"}</span>
        </div>
        <div className="dropdown dropdown-end">
          <button tabIndex={0} onClick={centerIconButtonClickHandler} className="btn btn-ghost my-auto">
            <MoreHorizIcon />
          </button>
          {menu}
        </div>
      </li>
    </>
  )
}

export function UsersSidebar({ open, setOpen }: {
  open: boolean
  setOpen: (value: boolean) => void
}) {
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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [handleUsername, setHandleUsername] = useState("")
  const [handleUserID, setHandleUserID] = useState(0)

  const username = useSelector(state => state.username.value)

  const handleModifyPermissionButtonClick = useCallback(() => {
    setDialogOpen(true)
  }, [])

  const handleKickButtonClick = useCallback(async () => {
    if (chat == undefined) return
    if (handleUsername == username) {
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
    } else {
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

  const modifyPermissionDialogID = useId()

  const menu = (
    <ul className="menu mt-4 bg-base-100 flex-1 ml-auto dropdown-content" tabIndex={0}>
      <li><a onClick={handleKickButtonClick}>{handleUsername == username ? "Quit" : "Kick"}</a></li>
      <li><a onClick={handleBanButtonClick}>{permissionRawData?.[handleUserID]?.banned ? "Unban" : "Ban"}</a></li>
      <li><label htmlFor={modifyPermissionDialogID}>Modify Permission</label></li>
    </ul>
  )

  return (
    <div className={classNames("w-full overflow-x-hidden flex transition-all duration-300 no-scrollbar bg-white", {
      "sm:max-w-xs max-w-full sm:w-xs w-full overflow-y-auto": open,
      "max-w-0 overflow-y-hidden": !open
    })}>
      <ModifyPermissionDialog open={dialogOpen} setOpen={setDialogOpen} uid={handleUserID} username={handleUsername} modifyPermissionDialogID={modifyPermissionDialogID} />
      <ul className="flex-1 flex flex-col py-2">
        <button className="btn btn-ghost btn-circle sm:hidden" onClick={() => setOpen(false)}>
          <CloseIcon />
        </button>
        {users.map((user, index) => {
          const [name, id, online] = user
          return (
            <UserItem
              name={name}
              id={id}
              online={online}
              setHandleUsername={setHandleUsername}
              setHandleUserID={setHandleUserID}
              key={id}
              first={!index}
              menu={menu}
            />
          )
        })}
      </ul>
    </div>
  )
}

export function MainLayout({ children }: {
  children: ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const session = useSelector(state => state.chat.session)
  const toggleCallback = useCallback(() => setSidebarOpen(!sidebarOpen), [setSidebarOpen, sidebarOpen])
  const toggleRightCallback = useCallback(() => setRightSidebarOpen(!rightSidebarOpen), [setRightSidebarOpen, rightSidebarOpen])
  const leftSidebarID = useId()
  return (
    <div className="flex flex-1 overflow-hidden drawer drawer-mobile">
      <input id={leftSidebarID} type="checkbox" className="drawer-toggle" />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className={classNames("flex flex-col flex-1 transition-all duration-300 overflow-x-hidden", rightSidebarOpen ? "w-0 sm:w-auto" : sidebarOpen ? "w-0 sm:w-auto" : "w-full")}>
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