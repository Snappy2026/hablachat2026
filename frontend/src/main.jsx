import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Force unregister stale PWA caches on mobile Safari & Chrome
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
