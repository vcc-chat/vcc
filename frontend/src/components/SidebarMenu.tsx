import { useCallback, useId } from "preact/hooks"
import { useNavigate } from "react-router-dom"

import GroupAddIcon from "@material-design-icons/svg/outlined/group_add.svg"
import AddCircleIcon from "@material-design-icons/svg/outlined/add_circle_outline.svg"
import MenuIcon from "@material-design-icons/svg/outlined/menu.svg"

import { JoinDialog } from "./Toolbar"
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
      <div className="flex">
        <div className="opacity-80 text-sm m-4 select-none">{t("Chat")}</div>
        <div className="dropdown ml-auto dropdown-end">
          <label tabIndex={0} className="btn btn-square btn-ghost">
            <MenuIcon />
          </label>
          <ul tabIndex={0} className="dropdown-content menu whitespace-nowrap bg-base-100 p-2 rounded-box mr-2">
            <li>
              <a onClick={listCreateItemButtonClickHandler}>
                <div className="my-auto opacity-60">
                  <AddCircleIcon />
                </div>
                <div className="text-base ml-2">{t("Create Chat")}</div>
              </a>
            </li>
            <li>
              <label htmlFor={joinChatDialogID}>
                <div className="my-auto opacity-60">
                  <GroupAddIcon />
                </div>
                <div className="text-base ml-2">{t("Join Chat")}</div>
              </label>
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}
