import { describe, expect, it } from 'vitest';
import type {
  ChatMessageDto,
  MailAccountDto,
  MailMessageDetailDto,
  MailMessageSummaryDto,
  ProjectDto,
} from '../types/workspace.types';
import { daysUntil, formatDateTime, formatRelative, initialsOf, pluralize } from '../utils/format';
import { MAX_MESSAGE_LENGTH, checkDraft, mergeMessage, mergeOlder } from './chat/chatMessages';
import { filterMessages } from './mail/MailList';
import { buildForward, buildReply } from './mail/mailCompose';
import { groupByWorkspace } from './profile/ProfileProjectsSection';
import { inviteUrl } from './settings/InvitationsTable';
import { PROJECT_PERMISSIONS, WORKSPACE_PERMISSIONS, can, groupPermissions } from './settings/permissionCatalog';
import { isModuleKey, orderModules } from './workspace/moduleMeta';

const msg = (id: string, createdAt: string): ChatMessageDto => ({
  id, channelId: 'c', senderId: 's', senderName: 'S', senderUsername: 's', content: id, createdAt,
});

describe('chat message merging', () => {
  it('inserts in chronological order and ignores duplicates', () => {
    const base = [msg('a', '2026-01-01T00:00:01Z'), msg('c', '2026-01-01T00:00:03Z')];
    const merged = mergeMessage(base, msg('b', '2026-01-01T00:00:02Z'));
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(mergeMessage(merged, msg('b', '2026-01-01T00:00:02Z'))).toBe(merged);
  });

  it('breaks timestamp ties by id so order is stable', () => {
    const merged = mergeMessage([msg('b', 't')], msg('a', 't'));
    expect(merged.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('prepends older pages without re-adding known messages', () => {
    const current = [msg('c', '2026-01-01T00:00:03Z')];
    const merged = mergeOlder(current, [msg('a', '2026-01-01T00:00:01Z'), msg('c', '2026-01-01T00:00:03Z')]);
    expect(merged.map((m) => m.id)).toEqual(['a', 'c']);
  });

  it('validates drafts at the length boundary', () => {
    expect(checkDraft('   ')).toEqual({ ok: false, error: 'Write a message first.' });
    expect(checkDraft(' hi ')).toEqual({ ok: true, content: 'hi' });
    expect(checkDraft('x'.repeat(MAX_MESSAGE_LENGTH)).ok).toBe(true);
    expect(checkDraft('x'.repeat(MAX_MESSAGE_LENGTH + 1)).ok).toBe(false);
  });
});

describe('mail compose helpers', () => {
  const account: MailAccountDto = {
    id: 'acc', provider: 'gmail', email: 'me@x.com', displayName: 'Me', status: 'CONNECTED', lastSyncedAt: 'x',
  };
  const inbound: MailMessageDetailDto = {
    id: 'm1', accountId: 'acc', folder: 'inbox', senderName: 'Dana', senderEmail: 'dana@x.com', recipientEmail: 'me@x.com',
    subject: 'Plan', snippet: 's', receivedAt: '2026-01-01T00:00:00Z', read: false, body: 'line one\nline two',
  };

  it('replies to the sender, quotes the body and links the original', () => {
    const reply = buildReply(inbound, account);
    expect(reply).toMatchObject({ toEmail: 'dana@x.com', subject: 'Re: Plan', inReplyToId: 'm1' });
    expect(reply.body).toContain('> line one\n> line two');
  });

  it('does not stack Re: prefixes and replies to the recipient when replying to a sent mail', () => {
    expect(buildReply({ ...inbound, subject: 'RE: Plan' }, account).subject).toBe('RE: Plan');
    const sent = { ...inbound, folder: 'sent' as const, senderEmail: 'ME@x.com', recipientEmail: 'dana@x.com' };
    expect(buildReply(sent, account).toEmail).toBe('dana@x.com');
  });

  it('forwards with an empty recipient and an original-message header', () => {
    const forward = buildForward(inbound);
    expect(forward.toEmail).toBe('');
    expect(forward.subject).toBe('Fwd: Plan');
    expect(forward.body).toContain('Forwarded message');
    expect(forward.body).toContain('line one');
    expect(buildForward({ ...inbound, subject: 'Fwd: Plan' }).subject).toBe('Fwd: Plan');
  });

  it('filters the list by subject, sender and snippet, case-insensitively', () => {
    const summary = (id: string, subject: string, senderName: string): MailMessageSummaryDto => ({
      id, accountId: 'acc', folder: 'inbox', senderName, senderEmail: `${id}@x.com`, recipientEmail: 'me@x.com',
      subject, snippet: 'body', receivedAt: 'x', read: true,
    });
    const list = [summary('a', 'Budget', 'Zed'), summary('b', 'Lunch', 'Amy')];
    expect(filterMessages(list, '').length).toBe(2);
    expect(filterMessages(list, 'BUDGET').map((m) => m.id)).toEqual(['a']);
    expect(filterMessages(list, 'amy').map((m) => m.id)).toEqual(['b']);
    expect(filterMessages(list, 'nothing')).toEqual([]);
  });
});

describe('profile and settings helpers', () => {
  const project = (id: string, workspaceId: string, workspaceName: string): ProjectDto => ({
    id, workspaceId, workspaceName, name: id, slug: id, description: null, memberCount: 1,
    enabledModules: [], myPermissions: [], createdAt: 'x', updatedAt: 'x',
  });

  it('groups projects by workspace, preserving order', () => {
    const groups = groupByWorkspace([project('p1', 'w1', 'A'), project('p2', 'w2', 'B'), project('p3', 'w1', 'A')]);
    expect(groups.map((g) => [g.workspaceName, g.projects.map((p) => p.id)])).toEqual([
      ['A', ['p1', 'p3']],
      ['B', ['p2']],
    ]);
    expect(groupByWorkspace([])).toEqual([]);
  });

  it('builds a shareable invite URL with an encoded token', () => {
    expect(inviteUrl('abc-DEF_1', 'https://orbit.dev')).toBe('https://orbit.dev/invite/abc-DEF_1');
    expect(inviteUrl('a b/c', 'https://orbit.dev')).toBe('https://orbit.dev/invite/a%20b%2Fc');
  });

  it('keeps the permission catalogs aligned with the backend model', () => {
    expect(WORKSPACE_PERMISSIONS).toHaveLength(32);
    expect(PROJECT_PERMISSIONS).toHaveLength(25);
    for (const defs of [WORKSPACE_PERMISSIONS, PROJECT_PERMISSIONS]) {
      expect(new Set(defs.map((d) => d.key)).size).toBe(defs.length);
    }
    expect(groupPermissions(WORKSPACE_PERMISSIONS).map((g) => g.group)).toEqual([
      'Workspace', 'Members', 'Roles', 'Modules', 'Integrations', 'Projects', 'Chat', 'Cloud Files', 'Git', 'Issues & Sprints',
    ]);
    expect(can(['a', 'b'], 'b')).toBe(true);
    expect(can([], 'b')).toBe(false);
  });

  it('orders modules by catalog order and drops unknown keys', () => {
    expect(orderModules(['issues', 'cloud', 'chat', 'unknown', 'git'])).toEqual(['git', 'chat', 'cloud', 'issues']);
    expect(isModuleKey('docs')).toBe(true);
    expect(isModuleKey('cloud')).toBe(true);
    expect(isModuleKey('issues')).toBe(true);
    expect(isModuleKey('ppt')).toBe(false);
  });
});

describe('format helpers', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');

  it('formats relative time across thresholds', () => {
    expect(formatRelative('2026-11-20T11:59:30Z', now)).toBe('just now');
    expect(formatRelative('2026-11-20T11:55:00Z', now)).toBe('5m ago');
    expect(formatRelative('2026-11-20T09:00:00Z', now)).toBe('3h ago');
    expect(formatRelative('2026-11-18T12:00:00Z', now)).toBe('2d ago');
    expect(formatRelative('garbage', now)).toBe('garbage');
  });

  it('derives initials defensively', () => {
    expect(initialsOf('Nhat Prx')).toBe('NP');
    expect(initialsOf('single')).toBe('S');
    expect(initialsOf('  ')).toBe('?');
    expect(initialsOf('a b c d')).toBe('AB');
  });

  it('pluralizes counts', () => {
    expect(pluralize(0, 'project')).toBe('0 projects');
    expect(pluralize(1, 'member')).toBe('1 member');
    expect(pluralize(2, 'member')).toBe('2 members');
  });

  it('formats a readable quoted-mail timestamp and falls back on garbage', () => {
    // Day depends on the machine's time zone; Intl may use a narrow no-break space before AM/PM.
    expect(formatDateTime('2026-11-20T03:48:00Z')).toMatch(/^Nov (19|20|21), 2026, \d{2}:\d{2}\s(AM|PM)$/);
    expect(formatDateTime('nope')).toBe('nope');
  });

  it('counts remaining restore days without going negative', () => {
    expect(daysUntil('2026-11-25T12:00:00Z', now)).toBe(5);
    expect(daysUntil('2026-11-20T12:30:00Z', now)).toBe(1);
    expect(daysUntil('2026-11-01T00:00:00Z', now)).toBe(0);
    expect(daysUntil('nope', now)).toBe(0);
  });
});
