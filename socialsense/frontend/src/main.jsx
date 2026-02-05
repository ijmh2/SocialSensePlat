import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import theme from './styles/theme';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <App />
          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1a1a2e',
                color: '#f0f0f0',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
