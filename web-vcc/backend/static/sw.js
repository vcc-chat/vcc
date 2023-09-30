/* eslint-disable no-undef */
// @ts-check
/// <reference no-default-lib="true" />
/// <reference lib="webworker" />
(function (self) {
  self.onpush = function (event) {
    const { chatName, username, chat, msg, session } = /** @type {{ chatName: string, username: string, chat: number, msg: string, session: string }} */ (
      (/** @type {PushMessageData} */ (event.data)).json()
    )
    event.waitUntil(
      self.registration.showNotification(session || chatName, {
        body: `${username}: ${msg}`,
        data: {
          chat
        }
      })
    )
  }
  self.onnotificationclick = function (event) {
    const { chat } = event.notification.data
    event.notification.close()
    const url = new URL(self.location.href)
    url.pathname = `/chats/${chat}`
    event.waitUntil(
      self.clients.openWindow(url)
    )
  }
})(/** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self)))