import type {
  OrbitProject,
  OrbitWorkspace,
  ProjectModuleId,
} from '../types/workspace.types';

export const ALL_PROJECT_MODULES: {
  id: ProjectModuleId;
  label: string;
  summary: string;
}[] = [
  { id: 'git', label: 'Git', summary: 'Repositories, commits, and pull requests' },
  { id: 'mail', label: 'Mail', summary: 'Project team inbox and notifications' },
  { id: 'cloud', label: 'Cloud Files', summary: 'Shared files, folders, and storage' },
  { id: 'chat', label: 'Community Chat', summary: 'Team channels and direct messages' },
  { id: 'docs', label: 'Docs', summary: 'Structured project documents' },
  { id: 'sheets', label: 'Sheets', summary: 'Data grids and spreadsheets' },
  { id: 'ppt', label: 'Slides', summary: 'Presentation decks' },
  { id: 'markdown', label: 'Markdown', summary: 'Plain-text engineering notes' },
];

export const INITIAL_WORKSPACES: OrbitWorkspace[] = [
  { id: 'ws_orbit_core', name: 'Orbit Core', slug: 'orbit-core', memberCount: 12 },
  { id: 'ws_personal_lab', name: 'Personal Lab', slug: 'nhatprx-lab', memberCount: 2 },
];

export const INITIAL_PROJECTS: OrbitProject[] = [
  {
    id: 'prj_alpha',
    workspaceId: 'ws_orbit_core',
    name: 'Project Alpha',
    slug: 'project-alpha',
    description: 'Core platform delivery with Git, Mail, Cloud Files, and Community Chat.',
    enabledModules: ['git', 'mail', 'cloud', 'chat'],
    memberCount: 8,
    updatedAt: '5m ago',
  },
  {
    id: 'prj_beta',
    workspaceId: 'ws_orbit_core',
    name: 'Project Beta',
    slug: 'project-beta',
    description: 'Engineering specs and capacity planning using Git, Docs, and Sheets.',
    enabledModules: ['git', 'docs', 'sheets'],
    memberCount: 5,
    updatedAt: '1h ago',
  },
  {
    id: 'prj_gamma',
    workspaceId: 'ws_orbit_core',
    name: 'Project Gamma',
    slug: 'project-gamma',
    description: 'Design system assets and release decks using Cloud Files, Slides, and Markdown.',
    enabledModules: ['cloud', 'ppt', 'markdown'],
    memberCount: 4,
    updatedAt: '3h ago',
  },
  {
    id: 'prj_sandbox',
    workspaceId: 'ws_personal_lab',
    name: 'Sandbox',
    slug: 'sandbox',
    description: 'Personal experiments with Git and Markdown.',
    enabledModules: ['git', 'markdown'],
    memberCount: 1,
    updatedAt: 'Yesterday',
  },
];
