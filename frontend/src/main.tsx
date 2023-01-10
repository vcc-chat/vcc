import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { PluginProvider } from './Plugin'

import App from './App'
import store from './store'
import { queryClient } from './tools'

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <PluginProvider>
        <App />
      </PluginProvider>
    </QueryClientProvider>
  </Provider>
)
