import type { TargetedEvent } from "preact/compat"
import { useCallback } from "preact/hooks"

export function SettingsEditItem({
  checked,
  setChecked,
  label
}: {
  checked: boolean
  setChecked: (checked: boolean) => void
  label: string
}) {
  const onInputHandler = useCallback(
    (ev: TargetedEvent<HTMLInputElement, Event>) => {
      setChecked(ev.currentTarget.checked)
    },
    [setChecked]
  )
  return (
    <div className="form-control">
      <label className="label cursor-pointer">
        <span className="label-text capitalize">{label}</span>
        <input type="checkbox" className="toggle" checked={checked} onInput={onInputHandler} />
      </label>
    </div>
  )
}
export const allPermissions = [
  "kick",
  "rename",
  "invite",
  "modify_permission",
  "send",
  "create_sub_chat",
  "create_session",
  "banned",
  "change_nickname"
] as const
export type PermissionKey = (typeof allPermissions)[number]
