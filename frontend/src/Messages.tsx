import { Avatar, Link } from "@mui/material"
import { ReactNode, useMemo } from "react"
import { Link as RouterLink } from "react-router-dom"

import { stringToColor } from "./tools"

export function MessageAvatar({ name }: {
  name: string
}) {
  const characters = name.split(" ")
  const letter1 = (characters[0]?.[0] ?? "").toUpperCase()
  const letter2 = (characters[1]?.[0] ?? "").toUpperCase()
  return (
    <Avatar style={{
      backgroundColor: stringToColor(name)
    }} className="w-9 h-9 text-lg">
      {letter1}{letter2}
    </Avatar>
  )
}

export function MessageLink({ link, children }: {
  link: string,
  children: ReactNode
}) {
  const url = useMemo(() => (new URL(link, location.href)), [link])
  const sameSite = url.host == location.host
  if (sameSite) {
    return (
      <Link component={RouterLink} to={url.pathname} children={children} />
    )
  } else {
    return (
      <Link href={link} children={children} target="_blank" rel="noopener noreferrer" />
    )
  }
}

