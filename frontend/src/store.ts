import { create } from "zustand"
import { persist, devtools } from "zustand/middleware"

import createMessageSlice from "./state/message"
import createLoginSlice from "./state/login"
import createChatSlice from "./state/chat"
import createPluginSlice from "./state/plugin"

const useStore = create<
  ReturnType<typeof createMessageSlice>
  & ReturnType<typeof createChatSlice>
  & ReturnType<typeof createLoginSlice>
  & ReturnType<typeof createPluginSlice>
>()(
  devtools(
    persist(
      (...a) => ({
        ...createMessageSlice(...a),
        ...createChatSlice(...a),
        ...createLoginSlice(...a),
        ...createPluginSlice(...a)
      }),
      {
        name: "zustand-store",
        partialize: state => ({
          messages: state.messages,
          token: state.token,
          pluginLinks: state.pluginLinks,
          markdownToHTML: state.markdownToHTML
        })
      }
    )
  )
)

export default useStore