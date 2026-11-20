import type { MailAccountDto, MailMessageDetailDto } from '../../types/workspace.types';
import { formatDateTime } from '../../utils/format';

export interface ComposeDraft {
  toEmail: string;
  subject: string;
  body: string;
  inReplyToId?: string;
}

export type ComposeMode = 'new' | 'reply' | 'forward';

const REPLY_PREFIX = /^\s*re:\s*/i;
const FORWARD_PREFIX = /^\s*fwd?:\s*/i;

function quote(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

function whoWrote(message: MailMessageDetailDto): string {
  return message.senderName ? `${message.senderName} <${message.senderEmail}>` : message.senderEmail;
}

/** Reply goes to the other party: the sender, or the recipient when replying from Sent. */
export function buildReply(message: MailMessageDetailDto, account: MailAccountDto): ComposeDraft {
  const mine = message.senderEmail.toLowerCase() === account.email.toLowerCase();
  const subject = REPLY_PREFIX.test(message.subject) ? message.subject : `Re: ${message.subject}`;
  return {
    toEmail: mine ? message.recipientEmail : message.senderEmail,
    subject,
    body: `\n\nOn ${formatDateTime(message.receivedAt)}, ${whoWrote(message)} wrote:\n${quote(message.body)}`,
    inReplyToId: message.id,
  };
}

export function buildForward(message: MailMessageDetailDto): ComposeDraft {
  const subject = FORWARD_PREFIX.test(message.subject) ? message.subject : `Fwd: ${message.subject}`;
  const header = [
    '---------- Forwarded message ----------',
    `From: ${whoWrote(message)}`,
    `To: ${message.recipientEmail}`,
    `Date: ${formatDateTime(message.receivedAt)}`,
    `Subject: ${message.subject}`,
  ].join('\n');
  return { toEmail: '', subject, body: `\n\n${header}\n\n${message.body}` };
}

export const EMPTY_DRAFT: ComposeDraft = { toEmail: '', subject: '', body: '' };
