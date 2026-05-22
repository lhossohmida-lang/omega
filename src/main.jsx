import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth.jsx'
import { enableIndexedDbPersistence } from 'firebase/firestore';
import { db } from './firebase.js';
import localSync from './services/localSync.js';

// ── Firestore offline persistence ──
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore offline: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore offline: browser not supported');
  }
});

// ── LocalSync: اتصال تلقائي بسيرفر الشبكة المحلية ──
localSync.connect();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#2a2a2a',
              color: '#e0e0e0',
              fontFamily: 'Cairo, sans-serif',
              direction: 'rtl',
              border: '1px solid rgba(255,255,255,0.1)',
            },
            success: {
              iconTheme: { primary: '#4caf50', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#e53935', secondary: '#fff' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
