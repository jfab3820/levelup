import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// When a new deployment has downloaded, tell the app so it can offer a "Refresh" banner.
// The registration is also kept on window in case the event fires before React has mounted.
serviceWorkerRegistration.register({
  onUpdate: registration => {
    window.__luWaitingRegistration = registration;
    window.dispatchEvent(new CustomEvent('lu-sw-update', { detail: registration }));
  },
});
reportWebVitals();
