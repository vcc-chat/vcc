import { memo } from "preact/compat"
import { useMatches, useNavigate, Outlet } from "react-router-dom"
import clsx from "clsx"
import { useTranslation } from "react-i18next"
import { useTitle } from "../tools"
import useStore from "../store"

export const Component = memo(function Settings() {
  const matches = useMatches()
  const showSettings = matches[4].pathname.split("/").at(-1)!
  const navigate = useNavigate()
  const setShowSettings = (item: string | undefined) => {
    navigate(`../${item ?? "null"}`, {
      replace: true,
      relative: "path"
    })
  }
  const chatName = useStore(state => state.chatName)
  const { t } = useTranslation()

  useTitle(`"${chatName}" Settings`)

  return (
    <div className="p-8 flex flex-col">
      <div className="tabs mb-4">
        <a
          className={clsx("tab tab-bordered", {
            "tab-active": showSettings == "info"
          })}
          onClick={() => {
            setShowSettings("info")
          }}
        >
          {t("Basic Information")}
        </a>
        <a
          className={clsx("tab tab-bordered", {
            "tab-active": showSettings == "actions"
          })}
          onClick={() => {
            setShowSettings("actions")
          }}
        >
          {t("Actions")}
        </a>
      </div>
      {showSettings != "null" && <Outlet />}
    </div>
  )
})
