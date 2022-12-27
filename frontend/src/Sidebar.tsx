import styled from "styled-components"
import { ReactNode, useState, useEffect } from "react"
import localforage from "localforage"

import AppBar from "@mui/material/AppBar"
import Typography from "@mui/material/Typography"
import Toolbar from "@mui/material/Toolbar"
import IconButton from "@mui/material/IconButton"
import Button from "@mui/material/Button"
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined"
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined"
import AccountCircle from "@mui/icons-material/AccountCircle"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"
import Tooltip from "@mui/material/Tooltip"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"

import { useSelector, useDispatch } from "./store"
import { Request, RequestType } from "./config"
import { ToolbarDialog, CreateChatDialog } from "./Toolbar"
import { changeName, changeValue } from "./state/chat"
import { reset } from "./state/login"

const RightIconButton = styled(IconButton)`
  margin-left: auto;
  color: white;
`

const PaddingTypography = styled(Typography)`
  padding-right: 0.5em;
` as any

export function NavBar({ onChange }: {
  onChange: (arg0: number) => void
}) {
  const chatName = useSelector(state => state.chat.name)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const menuOpen = !!anchorEl
  const dispatch = useDispatch()
  // 0 is chat, 1 is settings
  return (
    <AppBar position="static">
      <Toolbar>
        <PaddingTypography variant="h6" component="div">
          {chatName}
        </PaddingTypography>
        <Button color="inherit" onClick={() => {
          onChange(0)
        }}>
          Chat
        </Button>
        <Button color="inherit" onClick={() => {
          onChange(1)
        }}>
          Settings
        </Button>
        <RightIconButton 
          size="large"
          aria-haspopup="true"
          onClick={event => {
            setAnchorEl(event.currentTarget)
          }}
        >
          <AccountCircle />
        </RightIconButton>
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => {
            setAnchorEl(null)
          }}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
        >
          <MenuItem onClick={() => {
            (async () => {
              await localforage.removeItem("token")
              dispatch(reset())
              setAnchorEl(null)
            })()
          }}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}

const SidebarRoot = styled.div`
  max-width: 14em;
  visibility: visible;
  overflow: hidden;
  width: 100%;
  transition: max-width 0.3s ease;
`


export function Sidebar({ sendJsonMessage }: {
  sendJsonMessage: (arg: Request) => void
}) {
  const dispatch = useDispatch()
  const chatValue = useSelector(state => state.chat.value)
  const chatValues = useSelector(state => state.chat.values)
  const chatNames = useSelector(state => state.chat.names)

  const [joinChatDialogOpen, setJoinChatDialogOpen] = useState(false)
  const [createChatDialogOpen, setCreateChatDialogOpen] = useState(false)
  
  function clickHandler(value: number, name: string) {
    return function () {
      dispatch(changeValue(value))
      dispatch(changeName(name))
    }
  }
  return (
    <>
      <ToolbarDialog
        afterJoin={chat => {
          dispatch(changeValue(chat))
          sendJsonMessage({
            uid: 0,
            type: RequestType.CTL_LJOIN,
            usrname: "",
            msg: ""
          })
        }} 
        sendJsonMessage={sendJsonMessage} 
        typeNumber={RequestType.CTL_JOINS}
        typeString="join"
        open={joinChatDialogOpen}
        setOpen={setJoinChatDialogOpen}
      />
      <CreateChatDialog sendJsonMessage={sendJsonMessage} open={createChatDialogOpen} setOpen={setCreateChatDialogOpen} />
      <SidebarRoot>
        <List subheader={
          <ListSubheader component="div">
            Action
          </ListSubheader>
        }>
          <ListItem disablePadding>
            <ListItemButton onClick={() => {
              setCreateChatDialogOpen(true)
            }}>
              <ListItemIcon>
                <AddCircleOutlineOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Create chat" />
            </ListItemButton> 
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => {
              setJoinChatDialogOpen(true)
            }}>
              <ListItemIcon>
                <GroupAddOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Join chat" />
            </ListItemButton> 
          </ListItem>
        </List>
        <Divider />
        <List subheader={
          <ListSubheader component="div">
            Chat
          </ListSubheader>
        }>
          {chatValues.map((value, index) => (
            <ListItem disablePadding key={value}>
              <Tooltip title={`id: ${value}`}>
                <ListItemButton onClick={clickHandler(value, chatNames[index])} selected={value === chatValue}>
                  <ListItemText primary={chatNames[index]} />
                </ListItemButton> 
              </Tooltip>
            </ListItem>
          ))}
        </List>
        <Divider />
      </SidebarRoot>
    </>
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

export function MainLayout({ chat, settings, sendJsonMessage }: {
  chat: ReactNode,
  settings: ReactNode,
  sendJsonMessage: (arg: Request) => void
}) {
  const [index, setIndex] = useState(0)
  return (
    <Root>
      <Sidebar sendJsonMessage={sendJsonMessage} />
      <Container>
        <NavBar onChange={(newIndex) => {
          setIndex(newIndex)
        }} />
        {{
          0: chat
        }[index]}
      </Container>
    </Root>
  )
}