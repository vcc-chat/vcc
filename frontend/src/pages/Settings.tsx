import { memo } from "react"
import { useMatches, useNavigate, Outlet } from "react-router-dom"
import classNames from "classnames"
import { useTranslation } from "react-i18next"


export default memo(function Settings(props: {}) {
  const matches = useMatches()
  const showSettings = matches[3].pathname.split("/").at(-1)!
  const navigate = useNavigate()
  const setShowSettings = (item: string | undefined) => {
    navigate(`../${item ?? "null"}`, {
      replace: true,
      relative: "path"
    })
  }
  const { t } = useTranslation()

  return (
    <div className="p-8 flex flex-col">
      <div className="tabs mb-4">
        <a className={classNames("tab tab-bordered", {
          "tab-active": showSettings == "info"
        })} onClick={() => {
          setShowSettings("info")
        }}>{t("Basic Information")}</a> 
        <a className={classNames("tab tab-bordered", {
          "tab-active": showSettings == "actions"
        })} onClick={() => {
          setShowSettings("actions")
        }}>{t("Actions")}</a> 
      </div>
      {showSettings != "null" && <Outlet />}
    </div>
  )
})
