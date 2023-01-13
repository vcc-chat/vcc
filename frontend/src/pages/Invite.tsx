import { useState, useEffect } from "react"
import { useNavigate, useSearchParams, useLoaderData } from "react-router-dom"


import { RequestType, Request } from "../config"
import { useChatList, useNetwork } from "../tools"
import useStore from "../store"
import classNames from "classnames"


export default function Invite(props: {}) {
  const { makeRequest, ready, successAlert, errorAlert } = useNetwork()
  const { chat, token } = useLoaderData() as { chat: number, token: string }
  const { refresh: refreshChats, values: chats } = useChatList()
  const navigate = useNavigate()
  const changeValue = useStore(state => state.changeChat)
  return (
    <>
      {ready && (
        <>
          <div className={classNames("hero min-h-screen bg-base-200", {
            "hidden": !chats.includes(chat)
          })}>
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h1 className="text-5xl font-bold">Join chat</h1>
                <p className="py-6">You have already joined chat {chat}.</p>
                <button className="btn btn-primary" onClick={async () => {
                  navigate("/")
                }}>go back to home</button>
              </div>
            </div>
          </div>
          <div className={classNames("hero min-h-screen bg-base-200", {
            "hidden": chats.includes(chat)
          })}>
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h1 className="text-5xl font-bold">Join chat</h1>
                <p className="py-6">Would you like to join chat {chat}?</p>
                <button className="btn btn-primary" onClick={async () => {
                  const { uid } = await makeRequest({
                    type: RequestType.CTL_INVIT,
                    msg: token
                  })
                  console.log(uid)
                  if (uid) {
                    successAlert("You have joined the chat successfully. ")
                    changeValue(chat)
                    refreshChats()
                  } else {
                    errorAlert("Unexpected error occurred. ")
                  }
                  navigate("/")
                }}>join</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
