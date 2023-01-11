import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import legacy from "@vitejs/plugin-legacy"
import { VitePWA } from "vite-plugin-pwa"
import importToCDN, { autoComplete } from "vite-plugin-cdn-import"
import svgr from "vite-plugin-svgr"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ["defaults", "not IE 11"]
    }),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "web-vcc: vcc online",
        short_name: "web-vcc",
        description: "web-vcc: a new way for chat",
        theme_color: "#7a26c1",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    }),
    importToCDN({
      modules: [
        autoComplete("react"),
        autoComplete("react-dom"),
        autoComplete("localforage"),
        {
          name: "@tanstack/react-query",
          var: "ReactQuery",
          path: "build/umd/index.production.js"
        }
      ]
    }),
    svgr({
      exportAsDefault: true
    })
  ],
  resolve: {
    alias: {
      "@mui/base": "@mui/base/modern",
      "@mui/material": "@mui/material/modern",
      "@mui/styled-engine": "@mui/styled-engine/modern",
      "@mui/system": "@mui/system/modern",
      "@mui/utils": "@mui/utils/modern"
    },
    preserveSymlinks: true
  },
  server: {
    port: 3000
  }
})
