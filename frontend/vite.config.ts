import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import legacy from "@vitejs/plugin-legacy"
import { VitePWA } from "vite-plugin-pwa"
import importToCDN, { autoComplete } from "vite-plugin-cdn-import"
import svgr from "vite-plugin-svgr"
import banner from "vite-plugin-banner"

const comment = `
/**
 * The frontend part of web-vcc
 * @copyright The vcc group
 * @license AGPL-3.0-or-later
 */
`.slice(1, -1)

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
      },
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg}",
          "locales/**/*.json"
        ]
      }
    }),
    importToCDN({
      modules: [
        autoComplete("react"),
        autoComplete("react-dom"),
        {
          name: "@tanstack/react-query",
          var: "ReactQuery",
          path: "build/umd/index.production.js"
        }
      ]
    }),
    svgr({
      exportAsDefault: true
    }),
    banner(comment)
  ],
  resolve: {
    preserveSymlinks: true
  },
  server: {
    port: 3000
  }
})
