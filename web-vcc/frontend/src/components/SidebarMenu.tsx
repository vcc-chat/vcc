import { useId, useState } from "preact/hooks"

import AddCircleIcon from "@material-design-icons/svg/outlined/add_circle_outline.svg"
import GroupAddIcon from "@material-design-icons/svg/outlined/group_add.svg"
import MenuIcon from "@material-design-icons/svg/outlined/menu.svg"
import PersonAddIcon from "@material-design-icons/svg/outlined/person_add.svg"

import { HomeIcon, UserPlusIcon } from "@heroicons/react/24/outline"

import clsx from "clsx"
import { useTranslation } from "react-i18next"
import { AddFriendDialog, CreateDialog, JoinDialog } from "./Toolbar"

export function SidebarMenu({ index, setIndex }: { index: number; setIndex: (index: number) => void }) {
  const { t } = useTranslation()
  const joinChatDialogID = useId()
  const createChatDialogID = useId()
  const addFriendDialogID = useId()

  return (
    <>
      <JoinDialog id={joinChatDialogID} />
      <CreateDialog id={createChatDialogID} />
      <AddFriendDialog id={addFriendDialogID} />
      <div className="flex bg-base-100 rounded-xl">
        <ul className="menu menu-horizontal rounded-box gap-1 flex-1">
          <li>
            <a
              className={clsx({ active: index == 0 })}
              onClick={() => {
                setIndex(0)
              }}
            >
              <HomeIcon className="h-5 w-5 fill-none" />
            </a>
          </li>
          <li>
            <a
              className={clsx({ active: index == 1 })}
              onClick={() => {
                setIndex(1)
              }}
            >
              <UserPlusIcon className="h-5 w-5 fill-none" />
            </a>
          </li>
        </ul>
        <div className="dropdown dropdown-end my-auto">
          <label tabIndex={0} className="btn btn-square btn-ghost">
            <MenuIcon />
          </label>
          <ul tabIndex={0} className="dropdown-content menu whitespace-nowrap bg-base-100 p-2 rounded-box mr-2">
            <li>
              <label htmlFor={createChatDialogID}>
                <div className="my-auto opacity-60">
                  <AddCircleIcon />
                </div>
                <div className="text-base ml-2">{t("Create Chat")}</div>
              </label>
            </li>
            <li>
              <label htmlFor={joinChatDialogID}>
                <div className="my-auto opacity-60">
                  <GroupAddIcon />
                </div>
                <div className="text-base ml-2">{t("Join Chat")}</div>
              </label>
            </li>
            <li>
              <label htmlFor={addFriendDialogID}>
                <div className="my-auto opacity-60">
                  <PersonAddIcon />
                </div>
                <div className="text-base ml-2">{t("Add Friend")}</div>
              </label>
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}
