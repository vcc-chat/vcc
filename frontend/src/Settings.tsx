import { ChangeEvent, ReactNode, useCallback } from "react"

export function SettingsEditItem({ checked, setChecked, label }: {
  checked: boolean,
  setChecked: (checked: boolean) => void,
  label: string
}) {
  const onChangeHandler = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setChecked(ev.target.checked)
  }, [setChecked])
  return (
    <div className="form-control">
      <label className="label cursor-pointer">
        <span className="label-text">{label}</span> 
        <input type="checkbox" className="toggle" checked={checked} onChange={onChangeHandler} />
      </label>
    </div>
  )
}
export const allPermissions = ["kick", "rename", "invite", "modify_permission", "send", "create_sub_chat", "create_session", "banned"] as const
export type PermissionKey = typeof allPermissions[number]

export const allPermissionNames = ["kick", "rename", "invite", "modify permission", "send", "create sub-chats", "create session", "being banned"] as const
export type PermissionName = typeof allPermissionNames[number]

export function permissionKeyToName(key: PermissionKey): PermissionName {
  return allPermissionNames[allPermissions.indexOf(key)]
}
