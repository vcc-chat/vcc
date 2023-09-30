import { useId } from "preact/hooks"

import GroupAddIcon from "@material-design-icons/svg/outlined/group_add.svg"
import AddCircleIcon from "@material-design-icons/svg/outlined/add_circle_outline.svg"
import MenuIcon from "@material-design-icons/svg/outlined/menu.svg"

import { CreateDialog, JoinDialog } from "./Toolbar"
import { useTranslation } from "react-i18next"

export function SidebarMenu() {
  const { t } = useTranslation()
  const joinChatDialogID = useId()
  const createChatDialogID = useId()

  return (
    <>
      <JoinDialog id={joinChatDialogID} />
      <CreateDialog id={createChatDialogID} />
      <div className="flex">
        <div className="opacity-80 text-sm m-4 select-none">{t("Chat")}</div>
        <div className="dropdown ml-auto dropdown-end">
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
          </ul>
        </div>
      </div>
    </>
  )
}
