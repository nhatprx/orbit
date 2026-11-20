import { useState } from 'react';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { useResource } from '../../hooks/useResource';
import { accountSecurityService } from '../../services/accountSecurity.service';
import { projectService } from '../../services/workspace/services';
import type { AccountStatus, AuthUser } from '../../types/auth.types';
import type { ProfileSectionId } from '../../types/dashboard.types';
import type { ProfileUpdatePayload } from '../../types/profile.types';
import type { DashboardNavigation } from '../dashboard/useDashboardNavigation';
import { AccountSettingsSection } from './AccountSettingsSection';
import { ProfileOverview } from './ProfileOverview';
import { ProfileProjectsSection } from './ProfileProjectsSection';
import { ProfileSidebar } from './ProfileSidebar';
import { ProfileWorkspacesSection } from './ProfileWorkspacesSection';

interface ProfilePageProps {
  user: AuthUser;
  nav: DashboardNavigation;
  section: ProfileSectionId;
  onSectionChange: (section: ProfileSectionId) => void;
  onUserUpdated?: (user: AuthUser) => void;
}

const SECTIONS: TabItem<ProfileSectionId>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'projects', label: 'Projects' },
  { id: 'settings', label: 'Settings' },
];

export function ProfilePage({ user, nav, section, onSectionChange, onUserUpdated }: ProfilePageProps) {
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const projects = useResource(() => projectService.listMyProjects(0, 100), [user.id]);
  const activitySummary = useResource(() => accountSecurityService.getActivitySummary(), [user.id]);

  async function handleSaveProfile(payload: ProfileUpdatePayload) {
    setSaving(true);
    try {
      const updatedUser = await accountSecurityService.updateProfile({
        username: payload.username,
        displayName: payload.name,
        bio: payload.bio,
        organization: payload.organization,
        location: payload.location,
        website: payload.website,
      });
      onUserUpdated?.(updatedUser);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeStatus(activeStatus: AccountStatus) {
    setUpdatingStatus(true);
    try {
      const updatedUser = await accountSecurityService.updateProfile({ activeStatus });
      onUserUpdated?.(updatedUser);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSaveIntroduction(introduction: string) {
    const updatedUser = await accountSecurityService.updateProfile({ introduction });
    onUserUpdated?.(updatedUser);
  }

  async function handleSavePins(pinnedProjectIds: string[]) {
    const updatedUser = await accountSecurityService.updateProfile({ pinnedProjectIds });
    onUserUpdated?.(updatedUser);
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <ProfileSidebar
        user={user}
        saving={saving}
        updatingStatus={updatingStatus}
        onSave={handleSaveProfile}
        onChangeStatus={handleChangeStatus}
        onUserUpdated={onUserUpdated}
      />

      <div className="min-w-0 flex-1 space-y-5">
        <Tabs tabs={SECTIONS} active={section} onChange={onSectionChange} />
        {section === 'overview' && (
          <ProfileOverview
            user={user}
            projects={projects.data?.items ?? []}
            activitySummary={activitySummary.data}
            activityLoading={activitySummary.loading}
            nav={nav}
            onSaveIntroduction={handleSaveIntroduction}
            onSavePins={handleSavePins}
          />
        )}
        {section === 'workspaces' && <ProfileWorkspacesSection user={user} nav={nav} />}
        {section === 'projects' && <ProfileProjectsSection nav={nav} />}
        {section === 'settings' && <AccountSettingsSection />}
      </div>
    </div>
  );
}
