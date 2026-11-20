import { mockProviderIdentity } from '../../mocks/linkedAccount.mock';
import type { LinkedAccountDto, SocialProvider } from '../../types/workspace.types';
import { getStoredSession } from '../auth.storage';
import type { LinkedAccountService } from './collab.service';
import { ApiError } from './httpClient';

function delay(ms = 220): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Phase 1 mock of user-level social linking (D-05). Replaced by a real OAuth link flow later. */
export class MockLinkedAccountService implements LinkedAccountService {
  private accounts: LinkedAccountDto[] = [];
  private sequence = 0;

  constructor(private readonly currentHandle: () => string = defaultHandle) {}

  async listLinkedAccounts(): Promise<LinkedAccountDto[]> {
    await delay(100);
    return this.accounts.map((a) => ({ ...a }));
  }

  async connectProvider(provider: SocialProvider): Promise<LinkedAccountDto> {
    await delay(500);
    if (this.accounts.some((a) => a.provider === provider)) {
      throw new ApiError(409, 'CONFLICT', 'This provider is already connected.');
    }
    const identity = mockProviderIdentity(provider, this.currentHandle());
    const account: LinkedAccountDto = {
      id: `linked-${++this.sequence}`,
      provider,
      ...identity,
      connectedAt: new Date().toISOString(),
    };
    this.accounts = [...this.accounts, account];
    return { ...account };
  }

  async disconnectAccount(accountId: string): Promise<void> {
    await delay();
    if (!this.accounts.some((a) => a.id === accountId)) {
      throw new ApiError(404, 'NOT_FOUND', 'Linked account not found.');
    }
    this.accounts = this.accounts.filter((a) => a.id !== accountId);
  }
}

function defaultHandle(): string {
  const user = getStoredSession()?.user;
  return user?.username ?? user?.email.split('@')[0] ?? 'user';
}

export const mockLinkedAccountService: LinkedAccountService = new MockLinkedAccountService();
