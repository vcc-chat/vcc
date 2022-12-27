import styled from "styled-components"

import AppBar from "@mui/material/AppBar"
import Typography from "@mui/material/Typography"
import Toolbar from "@mui/material/Toolbar"
import IconButton from "@mui/material/IconButton"
import MenuIcon from "@mui/icons-material/Menu"
import Drawer from "@mui/material/Drawer"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"

import { ReactNode, useState, useEffect } from "react"
import { useSelector, useDispatch } from "./store"
import { Request, RequestType } from "./config"
import { changeName, changeValue } from "./state/chat"

export function NavBar({ open, setOpen }: {
  open: boolean,
  setOpen: (arg: boolean) => void
}) {
  const chatName = useSelector(state => state.chat.name)
  
  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton color="inherit" aria-label="Open sidebar" onClick={() => {
          setOpen(!open)
        }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div">
          {chatName}
        </Typography>
      </Toolbar>
    </AppBar>
  )
}

interface SidebarRootPropsType {
  open: boolean
  openDelayed: boolean
}

const SidebarRoot = styled.div`
  max-width: ${(props: SidebarRootPropsType) => props.open ? "10em": "1px"};
  margin-right: ${(props: SidebarRootPropsType) => props.open ? "0": "-1px"};
  visibility: ${(props: SidebarRootPropsType) => props.openDelayed ? "visible": "hidden"};
  overflow: hidden;
  width: 100%;
  transition: max-width 0.4s ease;
`


export function Sidebar({ open, setOpen, sendJsonMessage }: {
  open: boolean,
  setOpen: (arg: boolean) => void,
  sendJsonMessage: (arg: Request) => void
}) {
  const dispatch = useDispatch()
  const chatValue = useSelector(state => state.chat.value)
  const chatValues = useSelector(state => state.chat.values)
  const chatNames = useSelector(state => state.chat.names)
  const [openDelayed, setOpenDelayed] = useState(false)
  function clickHandler(value: number, name: string) {
    return function () {
      dispatch(changeValue(value))
      dispatch(changeName(name))
      setOpen(false)
    }
  }
  useEffect(() => {
    if (open) {
      setOpenDelayed(true)
    } else {
      const timeout = setTimeout(() => {
        setOpenDelayed(false)
      }, 400)
      return () => clearTimeout(timeout)
    }

  }, [open])
  return (
    <SidebarRoot open={open} openDelayed={openDelayed} aria-hidden={!open}>
      <List subheader={
        <ListSubheader component="div">
          Chat
        </ListSubheader>
      }>
        {chatValues.map((value, index) => (
          <ListItem disablePadding key={value}>
            <ListItemButton onClick={clickHandler(value, chatNames[index])} selected={value === chatValue}>
              <ListItemText primary={chatNames[index]} />
            </ListItemButton> 
          </ListItem>
        ))}
      </List>
      <Divider />
    </SidebarRoot>
  )
}

const Root = styled.div`
  display: flex;
  flex: 1;
`
const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`

export function MainLayout({ children, sendJsonMessage }: {
  children: ReactNode,
  sendJsonMessage: (arg: Request) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Root>
      <Sidebar open={open} setOpen={setOpen} sendJsonMessage={sendJsonMessage} />
      <Container>
        <NavBar open={open} setOpen={setOpen} />
        {children}
      </Container>
    </Root>
  )
}