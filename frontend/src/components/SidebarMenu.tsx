import { useState, useEffect, useCallback, useMemo, useId } from "preact/hooks"
import type { ComponentChildren } from "preact"
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

import { MESSAGE_MIME_TYPE, Request } from "../config"
import { JoinDialog, EditPermissionDialog as ModifyPermissionDialog } from "./Toolbar"
import { stringToColor, useChatList, useNetwork } from "../tools"
import useStore from "../store"
import { useTranslation } from "react-i18next"

export function SidebarMenu() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const joinChatDialogID = useId()

  const listCreateItemButtonClickHandler = useCallback(() => {
    navigate("/chats/create")
  }, [])
  

  return (
    <>
      <JoinDialog id={joinChatDialogID} />
      <div class="flex">
        <div class="opacity-80 text-sm m-4 select-none">{t("Chat")}</div>
        <div class="dropdown ml-auto dropdown-end">
          <label tabIndex={0} class="btn btn-square btn-ghost">
            <MenuIcon />
          </label>
          <ul tabIndex={0} class="dropdown-content menu whitespace-nowrap bg-base-100 p-2 rounded-box mr-2">
            <li>
              <a onClick={listCreateItemButtonClickHandler}>
                <div class="my-auto opacity-60">
                  <AddCircleIcon />
                </div>
                <div class="text-base ml-2">{t("Create Chat")}</div>
              </a>
            </li>
            <li>
              <label htmlFor={joinChatDialogID}>
                <div class="my-auto opacity-60">
                  <GroupAddIcon />
                </div>
                <div class="text-base ml-2">{t("Join Chat")}</div>
              </label>
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}