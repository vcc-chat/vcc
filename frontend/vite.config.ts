import { defineConfig } from "vite"
import preact from "@preact/preset-vite"
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
  base:"/static/",
  plugins: [
    preact(),
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
          "**/*.{js,css,html,ico,png,svg}"
          // "locales/**/*.json"
        ]
      }
    }),
    // importToCDN({
    //   modules: [
    //     {
    //       name: "@tanstack/react-query",
    //       var: "ReactQuery",
    //       path: "build/umd/index.production.js"
    //     }
    //   ]
    // }),
    svgr({
      exportAsDefault: true
    }),
    banner(comment)
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "react": "preact/compat",
      "react-dom": "preact/compat",
      "create-react-class": "preact-compat/lib/create-react-class",
      "react-dom-factories": "preact-compat/lib/react-dom-factories"
    }
  },
  server: {
    port: 3000
  }
})
