import { describe, expect, it } from 'vitest';
import type { MemberDto } from '../../types/workspace.types';
import { filterMentionCandidates } from './ChatMentionMenu';
import { findActiveSlash, stripSlashToken } from './ChatSlashFileMenu';

const MEMBERS: MemberDto[] = [
  {
    userId: 'u-1',
    username: 'nhatprx',
    displayName: 'Minh Nhat',
    email: 'nhat@orbit.dev',
    roleId: 'r-1',
    roleName: 'Owner',
    isOwner: true,
    joinedAt: '2026-11-20T00:00:00Z',
  },
];

describe('Chat @ai mention & / workspace file picker helpers', () => {
  it('includes @ai and @all alongside channel members in mention candidates', () => {
    const all = filterMentionCandidates(MEMBERS, '');
    expect(all.map((c) => c.handle)).toEqual(['all', 'ai', 'nhatprx']);

    const aiOnly = filterMentionCandidates(MEMBERS, 'ai');
    expect(aiOnly.map((c) => c.handle)).toEqual(['ai']);
    expect(aiOnly[0]?.isAi).toBe(true);
  });

  it('detects active / slash file query at start or after whitespace', () => {
    expect(findActiveSlash('/', 1)).toEqual({ start: 0, query: '' });
    expect(findActiveSlash('Please check /spec', 18)).toEqual({ start: 13, query: 'spec' });
    expect(findActiveSlash('https://example.com/path', 24)).toBeNull();
    expect(findActiveSlash('/file done', 10)).toBeNull();
  });

  it('strips slash token cleanly after selecting a workspace file', () => {
    const res = stripSlashToken('Review /arch now', 7, 12);
    expect(res.next).toBe('Review now');
  });
});
