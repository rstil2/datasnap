import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './polyfills/browser-polyfills' // Load polyfills first
import '@/styles/global.css'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'

// Prevent file drops from navigating the window in Electron
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
} else {
  console.error('❌ Root element not found!');
}
