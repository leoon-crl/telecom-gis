import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { FournisseurAuth } from './hooks/useAuth.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <FournisseurAuth>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              background: '#0B2447',
              color: '#fff',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#14A85C', secondary: '#fff' } },
            error: { iconTheme: { primary: '#EF3340', secondary: '#fff' } },
          }}
        />
      </FournisseurAuth>
    </BrowserRouter>
  </React.StrictMode>
)
