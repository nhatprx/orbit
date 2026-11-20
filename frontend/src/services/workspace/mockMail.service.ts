import { seedMessages } from '../../mocks/mailAccount.mock';
import type {
  ConnectImapMailRequest,
  ConnectOAuthMailRequest,
  MailAccountDto,
  MailMessageDetailDto,
  MailMessageSummaryDto,
  SendMailRequest,
} from '../../types/workspace.types';
import type { MailService } from './collab.service';
import { ApiError } from './httpClient';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FAILING_IMAP_HOST = 'error.example.com';
const LIST_LIMIT = 50;

type Folder = NonNullable<Parameters<MailService['listMessages']>[1]>;

function delay(ms = 180): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function invalid(message: string): ApiError {
  return new ApiError(400, 'VALIDATION_ERROR', message);
}

function toSummary({ body: _body, ...summary }: MailMessageDetailDto): MailMessageSummaryDto {
  return summary;
}

/**
 * Phase 1 mock of the global Mails module (D-06..D-09). Credentials are validated but never
 * stored, and disconnecting removes the account together with its cached messages (BR-12).
 */
export class MockMailService implements MailService {
  private accounts: MailAccountDto[] = [];
  private readonly messages = new Map<string, MailMessageDetailDto[]>();
  private sequence = 0;

  async listAccounts(): Promise<MailAccountDto[]> {
    await delay();
    return this.accounts.map((a) => ({ ...a }));
  }

  async connectOAuthAccount(request: ConnectOAuthMailRequest): Promise<MailAccountDto> {
    await delay(350);
    return this.register(request.provider, request.email, request.displayName);
  }

  async connectImapAccount(request: ConnectImapMailRequest): Promise<MailAccountDto> {
    await delay(450);
    if (!request.host.trim()) throw invalid('IMAP host is required.');
    if (!Number.isInteger(request.port) || request.port < 1 || request.port > 65535) {
      throw invalid('IMAP port must be between 1 and 65535.');
    }
    if (!request.username.trim() || !request.password) {
      throw invalid('IMAP username and password are required.');
    }
    if (request.host.trim().toLowerCase() === FAILING_IMAP_HOST) {
      throw new ApiError(502, 'MAIL_CONNECTION_FAILED', 'Could not connect to the IMAP server.');
    }
    return this.register('imap', request.email, request.displayName);
  }

  async disconnectAccount(accountId: string): Promise<void> {
    await delay();
    if (!this.accounts.some((a) => a.id === accountId)) {
      throw new ApiError(404, 'NOT_FOUND', 'Mail account not found.');
    }
    this.accounts = this.accounts.filter((a) => a.id !== accountId);
    this.messages.delete(accountId);
  }

  async listMessages(accountId: string, folder: Folder = 'inbox'): Promise<MailMessageSummaryDto[]> {
    await delay();
    return this.require(accountId)
      .filter((m) => m.folder === folder)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, LIST_LIMIT)
      .map(toSummary);
  }

  async getMessage(accountId: string, messageId: string): Promise<MailMessageDetailDto> {
    await delay(120);
    const found = this.require(accountId).find((m) => m.id === messageId);
    if (!found) throw new ApiError(404, 'NOT_FOUND', 'Message not found.');
    return { ...found };
  }

  async sendMessage(request: SendMailRequest): Promise<MailMessageSummaryDto> {
    await delay(300);
    const list = this.require(request.accountId);
    const account = this.accounts.find((a) => a.id === request.accountId);
    if (!account) throw new ApiError(404, 'NOT_FOUND', 'Mail account not found.');
    if (!EMAIL_PATTERN.test(request.toEmail.trim())) throw invalid('Recipient email is not valid.');
    if (!request.subject.trim()) throw invalid('Subject is required.');
    if (request.body.length > 20_000) throw invalid('Message body is too long.');

    const body = request.body.trim();
    const sent: MailMessageDetailDto = {
      id: `${request.accountId}-sent-${++this.sequence}`,
      accountId: request.accountId,
      folder: 'sent',
      senderName: account.displayName,
      senderEmail: account.email,
      recipientEmail: request.toEmail.trim(),
      subject: request.subject.trim(),
      snippet: body.replace(/\s+/g, ' ').slice(0, 100),
      receivedAt: new Date().toISOString(),
      read: true,
      body,
    };
    list.push(sent);
    return toSummary(sent);
  }

  async markRead(accountId: string, messageId: string, read: boolean): Promise<void> {
    await delay(60);
    const found = this.require(accountId).find((m) => m.id === messageId);
    if (found) found.read = read;
  }

  private require(accountId: string): MailMessageDetailDto[] {
    const list = this.messages.get(accountId);
    if (!list) throw new ApiError(404, 'NOT_FOUND', 'Mail account not found.');
    return list;
  }

  private register(provider: MailAccountDto['provider'], rawEmail: string, displayName?: string): MailAccountDto {
    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) throw invalid('Email address is not valid.');
    if (this.accounts.some((a) => a.email === email && a.provider === provider)) {
      throw new ApiError(409, 'CONFLICT', 'This mail account is already connected.');
    }
    const account: MailAccountDto = {
      id: `mail-acc-${++this.sequence}`,
      provider,
      email,
      displayName: displayName?.trim() || email.split('@')[0] || email,
      status: 'CONNECTED',
      lastSyncedAt: new Date().toISOString(),
    };
    this.accounts = [...this.accounts, account];
    this.messages.set(account.id, seedMessages(account.id, email, Date.now()));
    return { ...account };
  }
}

export const mockMailService: MailService = new MockMailService();
