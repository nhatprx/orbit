export type MailFolder =
  | 'inbox'
  | 'starred'
  | 'sent'
  | 'drafts'
  | 'archive'
  | 'trash';

export interface MailMessage {
  id: string;
  folder: Exclude<MailFolder, 'starred'>;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  preview: string;
  body: string;
  timestamp: string;
  unread: boolean;
  starred: boolean;
  labels: string[];
}

export interface ComposeMailPayload {
  toEmail: string;
  subject: string;
  body: string;
}
