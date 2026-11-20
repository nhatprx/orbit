import {
  Accessibility,
  BookMarked,
  Building2,
  FlaskConical,
  FolderGit2,
  Paintbrush,
  Settings,
  Upload,
  User,
} from 'lucide-react';
import type { ProfileSectionId, WorkspaceAreaId } from '../../types/dashboard.types';

export interface ProfileMenuItem {
  label: string;
  icon: typeof User;
  area?: WorkspaceAreaId;
  /** Opens the Profile area on this tab instead of switching area. */
  section?: ProfileSectionId;
  badge?: { text: string; tone: 'green' | 'neutral' };
}

export const PRIMARY_PROFILE_ITEMS: ProfileMenuItem[] = [
  { label: 'Profile', icon: User, section: 'overview' },
  { label: 'Workspaces', icon: Building2, section: 'workspaces' },
  { label: 'Projects', icon: FolderGit2, section: 'projects' },
  { label: 'Repositories', icon: BookMarked, area: 'git' },
];

export const SETTINGS_PROFILE_ITEMS: ProfileMenuItem[] = [
  { label: 'Settings', icon: Settings, section: 'settings' },
  { label: 'Feature preview', icon: FlaskConical, badge: { text: 'New', tone: 'green' } },
  { label: 'Appearance', icon: Paintbrush },
  { label: 'Accessibility', icon: Accessibility },
  { label: 'Try Enterprise', icon: Upload, badge: { text: 'Free', tone: 'neutral' } },
];
