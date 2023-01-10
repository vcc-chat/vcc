import { ChangeEvent, ReactNode, useCallback } from "react"
import { Outlet } from "react-router-dom"

import {
  Typography,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionDetails,
  AccordionSummary
} from "@mui/material"

import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material"

export function SettingsEditItem({ checked, setChecked, label }: {
  checked: boolean,
  setChecked: (checked: boolean) => void,
  label: string
}) {
  const onChangeHandler = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setChecked(ev.target.checked)
  }, [setChecked])
  return (
    <FormControlLabel 
      control={
        <Switch 
          checked={checked} 
          onChange={onChangeHandler} 
        />
      } 
      label={label} 
    />
  )
}
export const allPermissions = ["kick", "rename", "invite", "modify_permission", "send", "create_sub_chat", "create_session", "banned"] as const
export type PermissionKey = typeof allPermissions[number]

export const allPermissionNames = ["kick", "rename", "invite", "modify permission", "send", "create sub-chats", "create session", "being banned"] as const
export type PermissionName = typeof allPermissionNames[number]

export function permissionKeyToName(key: PermissionKey): PermissionName {
  return allPermissionNames[allPermissions.indexOf(key)]
}

export function SettingsAccordion({ showID, index, setIndex, title, subtitle }: {
  showID: string
  index: string | undefined
  setIndex: (index: string | undefined) => void
  title: string
  subtitle?: string
}) {
  const show = showID == index
  const onChangeHandler = useCallback(() => {
    setIndex(show ? undefined : showID)
  }, [setIndex, show, showID])
  return (
    <Accordion expanded={show} onChange={onChangeHandler}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
      >
        <Typography sx={{ width: '33%', flexShrink: 0 }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {show && <Outlet />}
      </AccordionDetails>
    </Accordion>
  )
}