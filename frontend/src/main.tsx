import { render } from "preact"
import { QueryClientProvider } from "@tanstack/react-query"
import { PluginProvider } from "./components/Plugin"

import App from "./App"
import { queryClient, registerServiceWorker } from "./tools"

import "./index.css"
import "./i18n"

if (import.meta.env.DEV) {
  await import("preact/debug" as any)
}

registerServiceWorker()

render(
  <QueryClientProvider client={queryClient}>
    <PluginProvider>
      <App />
    </PluginProvider>
  </QueryClientProvider>,
  document.getElementById("root")!
)
