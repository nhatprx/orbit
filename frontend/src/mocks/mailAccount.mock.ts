import type { MailMessageDetailDto } from '../types/workspace.types';

interface SeedMessage {
  folder: MailMessageDetailDto['folder'];
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  hoursAgo: number;
  read: boolean;
}

const SEEDS: SeedMessage[] = [
  {
    folder: 'inbox', senderName: 'Dana Whitfield', senderEmail: 'dana@acme.dev', read: false, hoursAgo: 1,
    subject: 'Sprint planning agenda',
    body: 'Hi,\n\nHere is the agenda for tomorrow:\n1. Review last sprint\n2. Capacity planning\n3. Release checklist\n\nPlease add topics before 5 pm.\n\nDana',
  },
  {
    folder: 'inbox', senderName: 'Build Server', senderEmail: 'ci@orbit.dev', read: false, hoursAgo: 3,
    subject: 'Pipeline passed on main',
    body: 'All checks passed for commit 4be1c9a.\n\nTypecheck: passed\nUnit tests: 105 passed\nBuild: passed',
  },
  {
    folder: 'inbox', senderName: 'Marcus Lee', senderEmail: 'marcus@northwind.io', read: false, hoursAgo: 6,
    subject: 'Contract draft for review',
    body: 'Hello,\n\nPlease find the updated contract draft. Section 4 changed after legal feedback.\nCould you confirm by Friday?\n\nBest,\nMarcus',
  },
  {
    folder: 'inbox', senderName: 'Priya Nair', senderEmail: 'priya@acme.dev', read: true, hoursAgo: 20,
    subject: 'Re: Design tokens update',
    body: 'Thanks for the quick turnaround. The green accent now matches the brand guide.\n\nI will merge the tokens PR this afternoon.',
  },
  {
    folder: 'inbox', senderName: 'Orbit Team', senderEmail: 'team@orbit.dev', read: true, hoursAgo: 30,
    subject: 'Welcome to your workspace',
    body: 'Your workspace is ready. Invite teammates, enable modules, and start your first project.',
  },
  {
    folder: 'inbox', senderName: 'Sam Okafor', senderEmail: 'sam@acme.dev', read: false, hoursAgo: 44,
    subject: 'Quarterly capacity numbers',
    body: 'Attached are the numbers for Q4. Headcount is flat, but contractor spend is up 8 percent.',
  },
  {
    folder: 'inbox', senderName: 'Lena Fischer', senderEmail: 'lena@globex.com', read: true, hoursAgo: 70,
    subject: 'Meeting notes: architecture review',
    body: 'Decisions:\n- Keep PostgreSQL as the primary store\n- Use Redis for sessions and rate limiting\n- Chat uses WebSocket with a Redis relay',
  },
  {
    folder: 'inbox', senderName: 'Hector Ruiz', senderEmail: 'hector@acme.dev', read: true, hoursAgo: 96,
    subject: 'Access request for the staging environment',
    body: 'Could you grant me read access to staging? I need it for the load test on Tuesday.',
  },
  {
    folder: 'sent', senderName: 'Me', senderEmail: '', read: true, hoursAgo: 8,
    subject: 'Re: Contract draft for review',
    body: 'Thanks Marcus, I will review section 4 today and reply tomorrow.',
  },
  {
    folder: 'sent', senderName: 'Me', senderEmail: '', read: true, hoursAgo: 52,
    subject: 'Release notes v0.4',
    body: 'Hi all,\n\nRelease notes for v0.4 are published. Highlights: workspaces, custom roles, and chat.',
  },
  {
    folder: 'archive', senderName: 'Billing', senderEmail: 'billing@cloudhost.example', read: true, hoursAgo: 200,
    subject: 'Invoice for October',
    body: 'Your invoice for October is available in the billing portal.',
  },
];

/** Deterministic seed so every connected account shows a realistic, bounded mailbox. */
export function seedMessages(
  accountId: string,
  accountEmail: string,
  nowMs: number
): MailMessageDetailDto[] {
  return SEEDS.map((seed, index) => {
    const isSent = seed.folder === 'sent';
    return {
      id: `${accountId}-msg-${index + 1}`,
      accountId,
      folder: seed.folder,
      senderName: seed.senderName,
      senderEmail: isSent ? accountEmail : seed.senderEmail,
      recipientEmail: isSent ? 'recipient@example.com' : accountEmail,
      subject: seed.subject,
      snippet: seed.body.replace(/\s+/g, ' ').slice(0, 100),
      receivedAt: new Date(nowMs - seed.hoursAgo * 3_600_000).toISOString(),
      read: seed.read,
      body: seed.body,
    };
  });
}
