/**
 * Frontend part of web-vcc
 * @copyright The VCC Group
 * @license AGPL-3.0-or-later
 */
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { PluginProvider } from './Plugin'

import App from './App'
import { queryClient } from './tools'

import './index.css'
import './i18n'

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <PluginProvider>
      <App />
    </PluginProvider>
  </QueryClientProvider>
)
