import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import AccountCircle from "@material-design-icons/svg/filled/account_circle.svg"
import CloseIcon from "@material-design-icons/svg/outlined/close.svg"
import ExpandLessIcon from "@material-design-icons/svg/outlined/expand_less.svg"
import ExpandMoreIcon from "@material-design-icons/svg/outlined/expand_more.svg"
import MenuIcon from "@material-design-icons/svg/outlined/menu.svg"
import MoreHorizIcon from "@material-design-icons/svg/outlined/more_horiz.svg"
import PeopleIcon from "@material-design-icons/svg/outlined/people.svg"
import TuneIcon from "@material-design-icons/svg/outlined/tune.svg"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import clsx from "clsx"
import type { ComponentChildren } from "preact"
import { useCallback, useEffect, useId, useMemo, useState } from "preact/hooks"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import rpc from "../network"
import useStore from "../store"
import { stringToColor, useAlert, useChatList } from "../tools"
import { MessageAvatar } from "./Messages"
import { SidebarMenu } from "./SidebarMenu"
import { ChangeNickname, EditPermissionDialog as ModifyPermissionDialog } from "./Toolbar"

export function NavBar({ toggle, toggleRightSidebar }: { toggle: () => void; toggleRightSidebar: () => void }) {
  const chatName = useStore(state => state.chatName)
  const session = useStore(state => state.session)
  const { t } = useTranslation()
  return (
    <div className="navbar bg-base-100">
      <div className="flex-none sm:hidden">
        <button className="btn btn-square btn-ghost" onClick={toggle}>
          <MenuIcon />
        </button>
      </div>
      <div className="flex-auto overflow-hidden">
        <a className="btn btn-ghost normal-case text-xl text-ellipsis">{session ?? chatName}</a>
      </div>
      <div className="flex-none">
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-square btn-ghost">
            <AccountCircle />
          </label>
          <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-10">
            <li>
              <Link to="/logout">{t("Logout")}</Link>
            </li>
          </ul>
        </div>
      </div>
      {session == null && (
        <div className="flex-none">
          <button className="btn btn-square btn-ghost inline-flex" onClick={toggleRightSidebar}>
            <PeopleIcon />
          </button>
        </div>
      )}
    </div>
  )
}

function SubChatSidebarItem({
  chat,
  clickHandler,
  settingsClickHandler,
  setOpen
}: {
  chat: number
  setOpen: (value: boolean) => void
  clickHandler: (value: number, name: string, session: string | null) => void
  settingsClickHandler: (value: number, name: string) => () => void
}) {
  const chatValue = useStore(state => state.chat)
  const { values: chatValues, names: chatNames } = useChatList()
  const sessions = useStore(state => state.sessions)
    .filter(([id]) => id == chat)
    .map(([, session]) => session)
  const currentSession = useStore(state => state.session)
  const [fold, setFold] = useState(true)
  return (
    <>
      <li className="py-1 px-2 flex w-full join">
        <button
          className={clsx(
            "flex flex-1 btn font-normal normal-case join-item",
            chatValue == chat && currentSession == null ? "btn-primary" : "btn-ghost"
          )}
          onClick={() => {
            setOpen(false)
            clickHandler(chat, chatNames[chatValues.indexOf(chat)], null)
          }}
        >
          <div className="ml-2 text-base my-auto mr-auto">{chatNames[chatValues.indexOf(chat)]}</div>
        </button>
        {!!sessions.length && (
          <button
            className="btn btn-accent join-item"
            onClick={() => {
              setFold(!fold)
            }}
          >
            {fold ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </button>
        )}
        <button
          className="btn btn-secondary join-item"
          onClick={settingsClickHandler(chat, chatNames[chatValues.indexOf(chat)])}
        >
          <TuneIcon />
        </button>
      </li>
      {!!sessions.length &&
        !fold &&
        sessions.map(session => (
          <li className="py-1 px-2 flex w-full join" key={session}>
            <button
              className={clsx(
                "flex flex-1 btn font-normal normal-case join-item",
                chatValue == chat && session == currentSession ? "btn-accent" : "btn-ghost"
              )}
              onClick={() => {
                setOpen(false)
                clickHandler(chat, chatNames[chatValues.indexOf(chat)], session)
              }}
            >
              <div className="ml-4 text-base my-auto mr-auto">{session}</div>
            </button>
          </li>
        ))}
    </>
  )
}

function SidebarItem({
  value,
  setOpen,
  subChats
}: {
  value: number
  setOpen: (value: boolean) => void
  subChats: number[]
}) {
  const navigate = useNavigate()
  const chatValue = useStore(state => state.chat)
  const { values: chatValues, names: chatNames } = useChatList()
  const changeValue = useStore(state => state.changeChat)
  const changeName = useStore(state => state.changeChatName)
  const changeSession = useStore(state => state.changeSession)
  const [fold, setFold] = useState(true)
  const clickHandler = useCallback((value: number, name: string, session: string | null = null) => {
    changeValue(value)
    changeName(name)
    changeSession(session)
    navigate(`/chats/${value}`)
  }, [])
  const settingsClickHandler = useCallback((value: number, name: string) => {
    return function () {
      changeValue(value)
      changeName(name)
      navigate(`/chats/${value}/settings/info`)
      setOpen(false)
    }
  }, [])
  return (
    <>
      <li className="py-1 px-2 flex w-full join">
        <button
          className={clsx(
            "flex flex-1 btn font-normal normal-case join-item",
            chatValue == value ? "btn-primary" : "btn-ghost"
          )}
          onClick={() => {
            setOpen(false)
            clickHandler(value, chatNames[chatValues.indexOf(value)])
          }}
        >
          <div className="text-base my-auto mr-auto">{chatNames[chatValues.indexOf(value)]}</div>
        </button>
        <button
          className={clsx("btn btn-accent join-item", {
            hidden: !subChats.length
          })}
          onClick={() => {
            setFold(!fold)
          }}
        >
          {fold ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </button>
        <button
          className="btn btn-secondary join-item"
          onClick={settingsClickHandler(value, chatNames[chatValues.indexOf(value)])}
        >
          <TuneIcon />
        </button>
      </li>
      {!fold &&
        subChats.map(chat => (
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

function FriendRequestItem({ user, time, reason }: { user: number; time: number; reason: string | null }) {
  const { data: nickname } = useQuery({
    queryKey: ["get-nickname", user],
    queryFn: async () => {
      return (await rpc.user.getNickName(user)) ?? undefined
    },
    placeholderData: undefined
  })

  return (
    <li className="flex">
      <div className="my-auto">
        <MessageAvatar name={nickname} className="w-10 h-10" />
      </div>
      <span className="my-auto m-2 text-lg">{nickname}</span>
      <div className="join ml-auto">
        <div className="tooltip tooltip-bottom" data-tip="Approve">
          <button className="btn btn-outline btn-success btn-square join-item">
            <CheckIcon className="h-6 w-6 fill-none" />
          </button>
        </div>
        <div className="tooltip tooltip-bottom" data-tip="Decline">
          <button className="btn btn-outline btn-error btn-square join-item">
            <XMarkIcon className="h-6 w-6 fill-none" />
          </button>
        </div>
      </div>
    </li>
  )
}

function FriendRequestList() {
  const { data: requests } = useQuery({
    queryKey: ["get-friend-request"],
    queryFn: rpc.friend.listRequest,
    placeholderData: []
  })
  return (
    <ul className="flex flex-col flex-1 p-2">
      {/* <div>Friend requests</div> */}
      {requests?.map(({ sender, time, reason }) => (
        <FriendRequestItem key={sender} user={sender} time={time} reason={reason} />
      ))}
    </ul>
  )
}

export function Sidebar({ open, setOpen }: { open: boolean; setOpen: (value: boolean) => void }) {
  const { parentChats } = useChatList()

  const sidebarItems = useMemo(
    () =>
      Object.entries<number[]>(parentChats).map(value => (
        <SidebarItem value={Number(value[0])} setOpen={setOpen} subChats={value[1]} key={value[0]} />
      )),
    [parentChats, setOpen]
  )

  const [index, setIndex] = useState(0)

  return (
    <>
      <div
        aria-hidden={!open}
        className={clsx(
          "duration-300 overflow-x-visible w-full transition-all no-scrollbar sm:max-w-[16rem] sm:w-[16rem] mt-1 flex flex-col",
          {
            "max-w-full w-full overflow-y-auto": open,
            "max-w-0 overflow-y-hidden": !open
          }
        )}
      >
        <SidebarMenu index={index} setIndex={setIndex} />
        <div className="divider mb-0 -mt-1" />
        {
          {
            0: <ul className="flex flex-col">{sidebarItems}</ul>,
            1: <FriendRequestList />
          }[index]
        }
      </div>
    </>
  )
}

function UserItem({
  name,
  id,
  online,
  setHandleUsername,
  setHandleUserID,
  first,
  menu
}: {
  name: string
  id: number
  online: boolean
  setHandleUsername: (value: string) => void
  setHandleUserID: (value: number) => void
  first: boolean
  menu: ComponentChildren
}) {
  const characters = name.split(" ")
  const letter1 = (characters[0]?.[0] ?? "").toUpperCase()
  const letter2 = (characters[1]?.[0] ?? "").toUpperCase()
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const centerIconButtonClickHandler = useCallback(() => {
    setShow(!show)
    setHandleUsername(name)
    setHandleUserID(id)
  }, [show, name, id])
  return (
    <>
      {!first && <div className="divider my-0" />}
      <li className="flex items-start py-2 px-6 my-1">
        <div className={clsx("avatar placeholder text-lg mr-4", online ? "online" : "offline")}>
          <div
            className="rounded-full w-10 h-10"
            style={{
              backgroundColor: stringToColor(name)
            }}
          >
            <span className="text-white">
              {letter1}
              {letter2}
            </span>
          </div>
        </div>
        <div className="flex flex-col flex-1">
          <div className="break-normal [overflow-wrap:anywhere]">{name}</div>
          <span className="opacity-50 text-sm mt-1">{t(online ? "Online" : "Offline")}</span>
        </div>
        <div className="dropdown dropdown-end">
          <label tabIndex={0} onClick={centerIconButtonClickHandler} className="btn btn-ghost btn-square my-auto">
            <MoreHorizIcon />
          </label>
          {menu}
        </div>
      </li>
    </>
  )
}

export function UsersSidebar({ open, setOpen }: { open: boolean; setOpen: (value: boolean) => void }) {
  const chat = useStore(state => state.chat)
  const { successAlert, errorAlert } = useAlert()
  const { refresh: refreshChats, values: chatValues, isLoading: chatValuesLoading } = useChatList()
  const navigate = useNavigate()
  const { t } = useTranslation()
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
      return await rpc.chat.getUsers(chat)
    },
    enabled: chat != null
  })
  useEffect(() => {
    if (!usersData) return
    for (const [uid, nickname] of usersData) {
      queryClient.setQueryData(["get-nickname", chat, uid], nickname)
    }
  }, [usersData])
  const { data: permissionRawData } = useQuery({
    queryKey: ["user-permission", chat],
    queryFn: async () => {
      if (chat == null) return
      return await rpc.chat.getAllPermission(chat)
    },
    enabled: chat != null
  })
  const { data: onlineData } = useQuery({
    queryKey: ["is-online", usersData],
    queryFn: async () => {
      if (usersData == null || !usersData.length) return []
      return await rpc.user.isOnline(usersData.map(a => a[0]))
    },
    enabled: chat != null && usersData != null && !!usersData?.length
  })
  const users: [string, number, boolean][] = useMemo(() => {
    if (!usersData) return []
    if (onlineData === undefined) {
      return usersData?.map?.(([id, name]) => [name, id, false]) ?? []
    } else {
      return usersData?.map?.(([id, name], index) => [name, id, onlineData[index]]) ?? []
    }
  }, [usersData, onlineData])

  const [handleUsername, setHandleUsername] = useState("")
  const [handleUserID, setHandleUserID] = useState(0)

  const username = useStore(state => state.username)

  const handleKickButtonClick = useCallback(async () => {
    if (chat == undefined) return
    if (handleUsername == username) {
      if (await rpc.chat.quit(chat)) {
        successAlert(t("You have quit the chat successfully. "))
        refreshChats()
      } else {
        errorAlert(t("Unexpected error: You haven't quit the chat successfully. "))
      }
    } else {
      if (await rpc.chat.kick(chat, handleUserID)) {
        successAlert(t("User has been kicked."))
        refreshChats()
        queryClient.invalidateQueries({ queryKey: ["user-list", chat] })
      } else {
        errorAlert(t("Permission denied."))
      }
    }
  }, [chat, handleUserID])

  const handleBanButtonClick = useCallback(async () => {
    const ban = !permissionRawData?.[handleUserID]?.banned
    if (await rpc.chat.modifyUserPermission(chat!, handleUserID, "banned", ban)) {
      successAlert(t(ban ? "User has been successfully banned." : "User has been successfully unbanned."))
      refreshChats()
      queryClient.invalidateQueries({ queryKey: ["user-list", chat] })
    } else {
      errorAlert(t("Permission denied."))
    }
  }, [handleUserID])

  const modifyPermissionDialogID = useId()
  const changeNicknameID = useId()

  const menu = (
    <ul className="menu mt-4 bg-base-100 flex-1 ml-auto dropdown-content whitespace-nowrap" tabIndex={0}>
      <li>
        <a onClick={handleKickButtonClick}>{t(handleUsername == username ? "Quit" : "Kick")}</a>
      </li>
      <li>
        <a onClick={handleBanButtonClick}>{t(permissionRawData?.[handleUserID]?.banned ? "Unban" : "Ban")}</a>
      </li>
      <li>
        <label htmlFor={modifyPermissionDialogID}>{t("Modify Permission")}</label>
      </li>
      <li>
        <label htmlFor={changeNicknameID}>{t("Change Nickname")}</label>
      </li>
    </ul>
  )

  const sortedUsers = useMemo(
    () =>
      users
        .sort()
        .sort((a, b) => -a[2] || +b[2])
        .sort((a, b) => -(a[0] == username) || +(b[0] == username)),
    [users, username]
  )

  return (
    <div
      className={clsx("w-full overflow-x-hidden flex transition-all duration-300 no-scrollbar bg-base-100", {
        "sm:max-w-[18rem] max-w-full sm:w-[18rem] w-full overflow-y-auto": open,
        "max-w-0 overflow-y-hidden": !open
      })}
    >
      <ModifyPermissionDialog
        uid={handleUserID}
        username={handleUsername}
        modifyPermissionDialogID={modifyPermissionDialogID}
      />
      <ChangeNickname id={changeNicknameID} uid={handleUserID} />
      <ul className="flex-1 flex flex-col py-2 max-w-full">
        <button className="btn btn-ghost btn-circle sm:hidden" onClick={() => setOpen(false)}>
          <CloseIcon />
        </button>
        {sortedUsers.map((user, index) => {
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

export function MainLayout({ children }: { children: ComponentChildren }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const session = useStore(state => state.session)
  const toggleCallback = useCallback(() => setSidebarOpen(!sidebarOpen), [setSidebarOpen, sidebarOpen])
  const toggleRightCallback = useCallback(
    () => setRightSidebarOpen(!rightSidebarOpen),
    [setRightSidebarOpen, rightSidebarOpen]
  )
  const leftSidebarID = useId()
  return (
    <div className="flex flex-1 overflow-hidden drawer drawer-mobile">
      <input id={leftSidebarID} type="checkbox" className="drawer-toggle" />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div
        className={clsx(
          "flex flex-col flex-1 transition-all duration-300 overflow-x-hidden",
          rightSidebarOpen ? "w-0 sm:w-auto" : sidebarOpen ? "w-0 sm:w-auto" : "w-full"
        )}
      >
        <NavBar toggle={toggleCallback} toggleRightSidebar={toggleRightCallback} />
        {children}
      </div>
      {session == null && <UsersSidebar open={rightSidebarOpen} setOpen={setRightSidebarOpen} />}
    </div>
  )
}
