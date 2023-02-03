import { render } from 'preact'
import { QueryClientProvider } from '@tanstack/react-query'
import { PluginProvider } from './Plugin'

import App from './App'
import { queryClient } from './tools'

import './index.css'
import './i18n'

render(
  <QueryClientProvider client={queryClient}>
    <PluginProvider>
      <App />
    </PluginProvider>
  </QueryClientProvider>,
  document.getElementById('root')!
)
