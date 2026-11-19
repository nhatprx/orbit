import type { ChatChannel, ChatMember, ChatMessage } from '../types/chat.types';

export const INITIAL_CHAT_CHANNELS: ChatChannel[] = [
  { id: 'ch_general', name: 'general', description: 'Workspace-wide engineering announcements and updates', kind: 'channel', unread: 0 },
  { id: 'ch_eng', name: 'engineering', description: 'Architecture, Spring Boot, ReactTS, and PostgreSQL', kind: 'channel', unread: 2 },
  { id: 'ch_design', name: 'design-system', description: 'Dark slate palette, Outfit typography, and square tokens', kind: 'channel', unread: 0 },
  { id: 'ch_deploy', name: 'deployments', description: 'AWS Docker builds, Redis health, and CI logs', kind: 'channel', unread: 1 },
  { id: 'dm_alex', name: 'Alex Mercer', description: 'Direct message with admin@orbit.dev', kind: 'dm', unread: 0, online: true },
  { id: 'dm_taylor', name: 'Taylor Lin', description: 'Direct message with taylor@orbit.dev', kind: 'dm', unread: 1, online: true },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_01',
    channelId: 'ch_general',
    authorName: 'Alex Mercer',
    authorHandle: 'alex',
    authorRole: 'admin',
    content: 'Welcome to Orbit Community Chat. All workspace discussions and release updates happen here.',
    timestamp: '09:30 AM',
  },
  {
    id: 'msg_02',
    channelId: 'ch_general',
    authorName: 'Taylor Lin',
    authorHandle: 'taylor',
    authorRole: 'user',
    content: 'The updated #0D1117 dark slate theme is live across Dashboard, Git, Mail, and Cloud Files.',
    timestamp: '09:44 AM',
  },
  {
    id: 'msg_03',
    channelId: 'ch_eng',
    authorName: 'Alex Mercer',
    authorHandle: 'alex',
    authorRole: 'admin',
    content: 'Reminder: ponytail enforces < 200 LOC per source file before any PR merges to main.',
    timestamp: '10:05 AM',
  },
  {
    id: 'msg_04',
    channelId: 'ch_eng',
    authorName: 'Jordan Vance',
    authorHandle: 'jordan',
    authorRole: 'user',
    content: 'Verified PgBouncer transaction pooling config for our 10k CCU staging benchmark.',
    timestamp: '10:18 AM',
  },
  {
    id: 'msg_05',
    channelId: 'ch_design',
    authorName: 'Taylor Lin',
    authorHandle: 'taylor',
    authorRole: 'user',
    content: 'All status indicators now use 6px x 6px square blocks with #22C55E green accent.',
    timestamp: 'Yesterday',
  },
  {
    id: 'msg_06',
    channelId: 'ch_deploy',
    authorName: 'Alex Mercer',
    authorHandle: 'alex',
    authorRole: 'admin',
    content: 'Docker image orbit-frontend built cleanly at 94.23 KB gzipped.',
    timestamp: '10:42 AM',
  },
  {
    id: 'msg_07',
    channelId: 'dm_alex',
    authorName: 'Alex Mercer',
    authorHandle: 'alex',
    authorRole: 'admin',
    content: 'Ping me once Community Chat UI is ready for review.',
    timestamp: '10:12 AM',
  },
  {
    id: 'msg_08',
    channelId: 'dm_taylor',
    authorName: 'Taylor Lin',
    authorHandle: 'taylor',
    authorRole: 'user',
    content: 'Can you check the typography contrast in the Cloud Files inspector?',
    timestamp: '10:35 AM',
  },
];

export const MOCK_CHAT_MEMBERS: ChatMember[] = [
  { id: 'm_1', name: 'Alex Mercer', handle: 'alex', role: 'admin', status: 'online' },
  { id: 'm_2', name: 'Taylor Lin', handle: 'taylor', role: 'user', status: 'online' },
  { id: 'm_3', name: 'Jordan Vance', handle: 'jordan', role: 'user', status: 'away' },
  { id: 'm_4', name: 'Samira Patel', handle: 'samira', role: 'user', status: 'offline' },
];
