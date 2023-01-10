import styled from "@emotion/styled"
import { ChangeEvent, ReactNode, useCallback } from "react"
import { Link, Outlet } from "react-router-dom"

import {
  Typography,
  Switch,
  List,
  Button as PureButton,
  FormGroup,
  FormControlLabel,
  Accordion,
  AccordionDetails,
  AccordionSummary
} from "@mui/material"

import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material"

export const SettingsItemText = styled.div`
  margin-bottom: 0.5em;
  font-size: 1.1em;
`

export const SettingsRoot = styled.div`
  padding: 2em;
  display: flex;
  flex-direction: column;
`

export const SettingsLink = styled(Link)`
  color: var(--gray-500);
  &:hover {
    color: var(--gray-700);
  }
  word-break: break-all;
`

export const SettingsList = styled(List)`
  border: 1px solid var(--gray-200);
  border-radius: 0.2em;
`

export const SettingsFormItem = styled.div`
  display: flex;
`

export const SettingsButton = styled(PureButton)`
  margin-top: auto;
  margin-bottom: auto;
  margin-right: auto;
  margin-left: 1em;
`

export const SettingsGroup = styled(FormGroup)`
  display: flex;
  flex-direction: row;
  gap: 0.5em;
`

const SettingsControlLabel = styled(FormControlLabel)``

export function SettingsEditItem({ checked, setChecked, label }: {
  checked: boolean,
  setChecked: (checked: boolean) => void,
  label: string
}) {
  const onChangeHandler = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setChecked(ev.target.checked)
  }, [setChecked])
  return (
    <SettingsControlLabel 
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
    <Accordion expanded={show} onChange={() => setIndex(show ? undefined : showID)}>
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