import { create } from "zustand"
import { persist, devtools, subscribeWithSelector } from "zustand/middleware"

import createMessageSlice from "./state/message"
import createLoginSlice from "./state/login"
import createChatSlice from "./state/chat"
import createPluginSlice from "./state/plugin"
import createNetworkSlice from "./state/network"
import createAlertSlice from "./state/alert"

const useStore = create<
  ReturnType<typeof createMessageSlice>
  & ReturnType<typeof createChatSlice>
  & ReturnType<typeof createLoginSlice>
  & ReturnType<typeof createPluginSlice>
  & ReturnType<typeof createNetworkSlice>
  & ReturnType<typeof createAlertSlice>
>()(
  devtools(
    persist(
      subscribeWithSelector(
        (...a) => ({
          ...createMessageSlice(...a),
          ...createChatSlice(...a),
          ...createLoginSlice(...a),
          ...createPluginSlice(...a),
          ...createNetworkSlice(...a),
          ...createAlertSlice(...a)
        })
      ),
      {
        name: "zustand-store",
        partialize: state => ({
          messages: state.messages,
          token: state.token,
          pluginLinks: state.pluginLinks,
          markdownToHTML: state.markdownToHTML,
          backendAddress: state.backendAddress,
          lastMessageTime: state.lastMessageTime
        })
      }
    )
  )
)

export default useStore