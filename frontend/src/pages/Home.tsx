import { useState } from "react"

import { RequestType, Request, RequestWithTime } from "../config"
import { Messages, MessageBody, MessageTitle, Message, MessageTime } from "../Messages"
import { FormList, FormItem, FormInput, Form, FormInputs, Button, LoginDialog } from "../Form"
import { Toolbar } from "../Toolbar"
import { MainLayout } from "../Sidebar"
import { useSelector } from "../store"

function addLeadingZero(a: string | number) {
  a = a + ""
  return a.padStart(2, "0")
}


export default function Home({ sendJsonMessage, ready, messageHistory }: {
  sendJsonMessage: (arg: Request) => void,
  messageHistory: RequestWithTime[],
  ready: boolean
}) {
  const [msgBody, setMsgBody] = useState("")
  const username = useSelector(state => state.username.value)
  const chat = useSelector(state => state.chat.value)
  const send = () => {
    if (!msgBody)
      return
    if (!ready)
      return
    if (chat == null)
      return
    const msg: Request = {
      uid: chat,
      type: RequestType.MSG_SEND,
      usrname: username,
      msg: msgBody
    }
    setMsgBody("")
    sendJsonMessage(msg)
  }
  return (
    <>
      <MainLayout 
        sendJsonMessage={sendJsonMessage}
        chat={(
          <>
            <FormList>
              <Messages>
                {messageHistory.filter(a => a.req.uid == chat).map(a => {
                  const req = a.req
                  const date = a.time
                  return (
                    <Message key={+date}>
                      <MessageTitle>
                        {req.usrname}
                        <MessageTime>
                          {addLeadingZero(date.getMonth() + 1)}-{addLeadingZero(date.getDate())}&nbsp;
                          {addLeadingZero(date.getHours())}:{addLeadingZero(date.getMinutes())}
                        </MessageTime>
                      </MessageTitle>
                      <MessageBody>{req.msg}</MessageBody>
                    </Message>
                  )
                })}
              </Messages>
              <Form>
                <FormInputs>
                  <FormItem>
                    <FormInput 
                      multiline 
                      type="text" 
                      label="Message" 
                      variant="filled" 
                      disabled={!ready || chat == null}
                      fullWidth 
                      onChange={event => {
                        setMsgBody(event.target.value)
                      }} 
                      onKeyDown={event => {
                        if (event.keyCode == 10 || event.keyCode == 13) {
                          if (event.ctrlKey || event.metaKey) {
                            setMsgBody(msgBody + "\n")
                          } else {
                            send()
                            event.preventDefault()
                          }
                        }
                      }}
                      value={msgBody} 
                    />
                  </FormItem>
                </FormInputs>
                <Button disabled={!ready || chat == null} onClick={send}>send</Button>
              </Form>
            </FormList>
            <Toolbar sendJsonMessage={sendJsonMessage} />
          </>
        )}
        settings={(
          <></>
        )}
      />
      
    </>
  )
}
