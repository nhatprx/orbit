import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { handleOAuthLinkPopupCallback } from './services/workspace/oauthPopup';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found.');
}

if (handleOAuthLinkPopupCallback()) {
  rootElement.innerHTML =
    '<div style="padding:24px;font-family:Outfit,sans-serif;font-size:13px;color:#E6EDF3">Account link completed. You can close this window.</div>';
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
