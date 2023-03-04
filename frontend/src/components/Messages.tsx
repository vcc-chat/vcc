import { useMemo } from "preact/hooks"
import type { ComponentChildren } from "preact"
import { Link } from "react-router-dom"

import { stringToColor } from "../tools"

export function MessageAvatar({ name }: {
  name: string
}) {
  const characters = name.split(" ")
  const letter1 = (characters[0]?.[0] ?? "").toUpperCase()
  const letter2 = (characters[1]?.[0] ?? "").toUpperCase()
  return (
    <div className="chat-image avatar placeholder">
      <div className="rounded-full w-9 h-9" style={{
        backgroundColor: stringToColor(name)
      }}>
        <span className="text-white">
          {letter1}{letter2}
        </span>
      </div>
    </div>
  )
}

export function MessageLink({ link, children }: {
  link: string,
  children: ComponentChildren
}) {
  const url = useMemo(() => (new URL(link, location.href)), [link])
  const sameSite = url.host == location.host
  if (sameSite) {
    return (
      <Link className="link" to={url.pathname}>{children}</Link>
    )
  } else {
    return (
      <a className="link" target="_blank" rel="noopener noreferrer">{children}</a>
    )
  }
}

