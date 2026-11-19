import { INITIAL_MOCK_MAILS } from '../mocks/mail.mock';
import type { AuthUser } from '../types/auth.types';
import type {
  ComposeMailPayload,
  MailFolder,
  MailMessage,
} from '../types/mail.types';

export interface IMailService {
  listMessages(folder: MailFolder, query?: string, limit?: number): Promise<MailMessage[]>;
  getUnreadCounts(): Promise<Record<MailFolder, number>>;
  setUnread(id: string, unread: boolean): Promise<void>;
  toggleStar(id: string): Promise<void>;
  moveToFolder(id: string, folder: Exclude<MailFolder, 'starred'>): Promise<void>;
  sendMail(payload: ComposeMailPayload, sender: AuthUser): Promise<MailMessage>;
}

let store: MailMessage[] = [...INITIAL_MOCK_MAILS];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockMailService implements IMailService {
  async listMessages(
    folder: MailFolder,
    query = '',
    limit = 25
  ): Promise<MailMessage[]> {
    await delay(80);
    const q = query.trim().toLowerCase();
    return store
      .filter((m) => (folder === 'starred' ? m.starred && m.folder !== 'trash' : m.folder === folder))
      .filter((m) => {
        if (!q) return true;
        return (
          m.subject.toLowerCase().includes(q) ||
          m.fromName.toLowerCase().includes(q) ||
          m.fromEmail.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q)
        );
      })
      .slice(0, limit);
  }

  async getUnreadCounts(): Promise<Record<MailFolder, number>> {
    return {
      inbox: store.filter((m) => m.folder === 'inbox' && m.unread).length,
      starred: store.filter((m) => m.starred && m.folder !== 'trash').length,
      sent: store.filter((m) => m.folder === 'sent').length,
      drafts: store.filter((m) => m.folder === 'drafts').length,
      archive: store.filter((m) => m.folder === 'archive').length,
      trash: store.filter((m) => m.folder === 'trash').length,
    };
  }

  async setUnread(id: string, unread: boolean): Promise<void> {
    store = store.map((m) => (m.id === id ? { ...m, unread } : m));
  }

  async toggleStar(id: string): Promise<void> {
    store = store.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m));
  }

  async moveToFolder(
    id: string,
    folder: Exclude<MailFolder, 'starred'>
  ): Promise<void> {
    store = store.map((m) => (m.id === id ? { ...m, folder } : m));
  }

  async sendMail(
    payload: ComposeMailPayload,
    sender: AuthUser
  ): Promise<MailMessage> {
    await delay(140);
    const created: MailMessage = {
      id: `mail_${Date.now()}`,
      folder: 'sent',
      fromName: sender.name,
      fromEmail: sender.email,
      toEmail: payload.toEmail.trim(),
      subject: payload.subject.trim(),
      preview: payload.body.trim().slice(0, 72),
      body: payload.body.trim(),
      timestamp: 'Just now',
      unread: false,
      starred: false,
      labels: ['Sent'],
    };
    store = [created, ...store];
    return created;
  }
}

export const mailService: IMailService = new MockMailService();
