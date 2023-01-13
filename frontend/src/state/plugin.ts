import { StateCreator } from "zustand"

interface PluginState {
  pluginLinks: string[]
}

const createPluginSlice: StateCreator<PluginState> = (set) => ({
  pluginLinks: []
})

export default createPluginSlice