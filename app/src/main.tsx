import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from '@/components/ui/sonner'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
