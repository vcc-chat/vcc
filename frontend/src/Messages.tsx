import styled from "@emotion/styled"
import { Avatar, Link } from "@mui/material"
import { ReactNode, useMemo } from "react"
import { Link as RouterLink } from "react-router-dom"

import { stringToColor } from "./tools"

export const Messages = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  overflow: auto;
  scrollbar-width: thin;
  ::-webkit-scrollbar {
    width: 7px;
    background-color: var(--gray-200);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--gray-300);
    border-radius: 1px;
    &:hover {
      background: var(--gray-400);
    }
    &:active {
      background: var(--gray-500);
    }
  }
`

const AvatarColored = styled(Avatar)`
  background-color: ${({ color }: { color: string }) => color};
  width: 36px;
  height: 36px;
  font-size: 1.125rem;
`

export function MessageAvatar({ name }: {
  name: string
}) {
  const characters = name.split(" ")
  const letter1 = (characters[0]?.[0] ?? "").toUpperCase()
  const letter2 = (characters[1]?.[0] ?? "").toUpperCase()
  return (
    <AvatarColored color={stringToColor(name)}>
      {letter1}{letter2}
    </AvatarColored>
  )
}

export const MessageUsername = styled.div`
  margin-top: auto;
  margin-bottom: auto;
  margin-left: 0.35em;
`

export const MessageTime = styled.div`
  display: none;
  color: var(--gray-500);
  margin-top: auto;
  margin-bottom: auto;
  margin-left: auto;
  margin-right: 1em;
  font-size: 0.75rem;
  font-weight: var(--normal-weight);
`

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

export const Message = styled.li<{
  showTitle: boolean
}>`
  list-style-type: none;
  &:hover {
    background-color: var(--gray-100);
  }
  &:hover ${MessageTime} {
    display: block;
  }
  margin: ${({ showTitle }) => showTitle ? "0.1em" : "0"} 0.1em;
  padding: ${({ showTitle }) => showTitle ? "0.3em" : "0"} 0.3em 0;
  border-radius: ${({ showTitle }) => showTitle ? "0.2em" : "0"};
`
export const MessageTitle = styled.div`
  display: flex;
  font-size: 1.25rem;
  font-weight: var(--bold-weight);
  line-break: anywhere;
`
export const MessageBody = styled.div`
  line-break: anywhere;
  white-space: pre-wrap;
  margin-left: 0.2em;
  display: flex;
`
export const MessageBodyMarkdown = styled.div`
  display: flex;
  flex-direction: column;
  p {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }
  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    display: inline;
  }
`

