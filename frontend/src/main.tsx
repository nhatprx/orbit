import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { handleGitOAuthPopupCallback } from './services/git/gitOAuthPopup';
import { handleOAuthLinkPopupCallback } from './services/workspace/oauthPopup';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found.');
}

if (handleGitOAuthPopupCallback()) {
  rootElement.innerHTML =
    '<div style="padding:24px;font-family:Outfit,sans-serif;font-size:13px;color:#E6EDF3">GitHub authorization completed. You can close this window.</div>';
} else if (handleOAuthLinkPopupCallback()) {
  rootElement.innerHTML =
    '<div style="padding:24px;font-family:Outfit,sans-serif;font-size:13px;color:#E6EDF3">Account link completed. You can close this window.</div>';
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
