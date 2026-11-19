import {
  Accessibility,
  BookMarked,
  Building2,
  Code2,
  FlaskConical,
  Globe,
  Paintbrush,
  Settings,
  Star,
  Upload,
  User,
} from 'lucide-react';
import type { WorkspaceAreaId } from '../../types/dashboard.types';

export interface ProfileMenuItem {
  label: string;
  icon: typeof User;
  area?: WorkspaceAreaId;
  badge?: { text: string; tone: 'green' | 'neutral' };
}

export const PRIMARY_PROFILE_ITEMS: ProfileMenuItem[] = [
  { label: 'Profile', icon: User, area: 'profile' },
  { label: 'Repositories', icon: BookMarked, area: 'git' },
  { label: 'Stars', icon: Star, area: 'overview' },
  { label: 'Snippets', icon: Code2, area: 'markdown' },
  { label: 'Workspaces', icon: Building2, area: 'overview' },
  { label: 'Organizations', icon: Globe, area: 'overview' },
];

export const SETTINGS_PROFILE_ITEMS: ProfileMenuItem[] = [
  { label: 'Settings', icon: Settings },
  { label: 'Feature preview', icon: FlaskConical, badge: { text: 'New', tone: 'green' } },
  { label: 'Appearance', icon: Paintbrush },
  { label: 'Accessibility', icon: Accessibility },
  { label: 'Try Enterprise', icon: Upload, badge: { text: 'Free', tone: 'neutral' } },
];
