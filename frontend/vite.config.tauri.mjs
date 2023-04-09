import { defineConfig, mergeConfig } from "vite"
import baseViteConfig from "./vite.config"
import tauri from "vite-plugin-tauri"

baseViteConfig.plugins.splice(1, 1)

export default defineConfig(
  mergeConfig(
    baseViteConfig,
    defineConfig({
      build: {
        target: "esnext"
      },
      plugins: [
        tauri()
      ],
      clearScreen: false,
      server: {
        open: false,
      },
    })
  )
)