import type { PinnedWorkspaceItem } from '../types/profile.types';

export const MOCK_PINNED_ITEMS: PinnedWorkspaceItem[] = [
  {
    id: 'pin_01',
    name: 'orbit-core',
    area: 'Git',
    description: 'Core workspace platform architecture, design tokens, and frontend shell.',
    tag: 'TypeScript',
    updatedAt: 'Updated 2h ago',
  },
  {
    id: 'pin_02',
    name: 'ponytail-governance',
    area: 'Git',
    description: 'Automated < 200 LOC, square-border, and zero-emoji compliance checker.',
    tag: 'Node.js',
    updatedAt: 'Updated 5h ago',
  },
  {
    id: 'pin_03',
    name: 'architecture-rfc',
    area: 'Docs',
    description: '10,000+ CCU scaling plan across PostgreSQL, Redis, and AWS Docker.',
    tag: 'Spec',
    updatedAt: 'Updated 1d ago',
  },
  {
    id: 'pin_04',
    name: 'design-system-v1',
    area: 'Markdown',
    description: 'Minimal black and green visual tokens with Outfit typography.',
    tag: 'Design',
    updatedAt: 'Updated 2d ago',
  },
];

export const MOCK_CONTRIBUTION_GRID: number[][] = [
  [0, 1, 2, 1, 0, 3, 2],
  [1, 2, 3, 2, 1, 0, 1],
  [0, 0, 1, 4, 3, 2, 1],
  [2, 3, 2, 1, 2, 4, 3],
  [1, 1, 0, 2, 3, 1, 0],
  [3, 4, 2, 1, 0, 2, 2],
  [0, 2, 3, 3, 2, 1, 1],
  [1, 0, 1, 2, 4, 3, 2],
  [2, 2, 4, 3, 1, 0, 1],
  [1, 3, 2, 2, 3, 4, 2],
  [0, 1, 1, 0, 2, 3, 1],
  [2, 4, 3, 2, 1, 2, 3],
  [1, 2, 2, 4, 3, 1, 0],
  [3, 1, 0, 2, 2, 4, 3],
  [2, 3, 4, 3, 2, 1, 2],
  [1, 2, 3, 4, 4, 3, 2],
];
