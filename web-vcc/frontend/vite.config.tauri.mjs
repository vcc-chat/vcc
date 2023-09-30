import { defineConfig, mergeConfig } from "vite"
import baseViteConfig from "./vite.config"
import tauri from "vite-plugin-tauri"

export default defineConfig(
  mergeConfig(
    baseViteConfig({
      mode: ""
    }),
    defineConfig({
      build: {
        target: "esnext"
      },
      plugins: [tauri()],
      clearScreen: false,
      server: {
        open: false
      }
    })
  )
)
