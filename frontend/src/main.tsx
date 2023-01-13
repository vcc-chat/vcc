import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { PluginProvider } from './Plugin'

import App from './App'
import { queryClient } from './tools'

import './index.css'

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <PluginProvider>
      <App />
    </PluginProvider>
  </QueryClientProvider>
)
