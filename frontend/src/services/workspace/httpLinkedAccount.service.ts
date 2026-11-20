import type { LinkedAccountDto, SocialProvider } from '../../types/workspace.types';
import { API_BASE_URL } from '../auth.storage';
import type { LinkedAccountService } from './collab.service';
import { apiRequest, seg } from './httpClient';
import { openOAuthPopup, waitForOAuthPopup } from './oauthPopup';

interface OAuthLinkStartResponse {
  linkUrl: string;
}

export const httpLinkedAccountService: LinkedAccountService = {
  listLinkedAccounts() {
    return apiRequest<LinkedAccountDto[]>('GET', '/api/v1/auth/linked-accounts');
  },

  async connectProvider(provider: SocialProvider): Promise<void> {
    const popup = openOAuthPopup();
    let res: OAuthLinkStartResponse;
    try {
      res = await apiRequest<OAuthLinkStartResponse>(
        'POST',
        `/api/v1/auth/linked-accounts/${seg(provider)}/link-token`
      );
    } catch (err) {
      popup?.close();
      throw err;
    }

    const fullUrl = `${API_BASE_URL}${res.linkUrl}`;
    if (!popup) {
      window.location.assign(fullUrl);
      return;
    }

    popup.location.href = fullUrl;
    popup.focus();
    const result = await waitForOAuthPopup(popup);
    if (result?.error) {
      throw new Error(result.error);
    }
  },

  disconnectAccount(accountId: string) {
    return apiRequest<void>('DELETE', `/api/v1/auth/linked-accounts/${seg(accountId)}`);
  },
};
