import { useEffect, useState } from 'react';
import { Panel } from '../../components/ui/Panel';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { dashboardService } from '../../services/dashboard.service';
import { profileService } from '../../services/profile.service';
import type { AuthUser } from '../../types/auth.types';
import type { ActivityRecord, ProfileSectionId } from '../../types/dashboard.types';
import type { ProfileData, ProfileUpdatePayload } from '../../types/profile.types';
import type { DashboardNavigation } from '../dashboard/useDashboardNavigation';
import { SocialAccountsPanel } from '../integrations/SocialAccountsPanel';
import { ProfileOverview } from './ProfileOverview';
import { ProfileProjectsSection } from './ProfileProjectsSection';
import { ProfileSidebar } from './ProfileSidebar';
import { ProfileWorkspacesSection } from './ProfileWorkspacesSection';

interface ProfilePageProps {
  user: AuthUser;
  nav: DashboardNavigation;
  section: ProfileSectionId;
  onSectionChange: (section: ProfileSectionId) => void;
}

const SECTIONS: TabItem<ProfileSectionId>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'projects', label: 'Projects' },
  { id: 'accounts', label: 'Connected accounts' },
];

export function ProfilePage({ user, nav, section, onSectionChange }: ProfilePageProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([profileService.getProfile(user), dashboardService.getRecentActivity(6)]).then(
      ([profileData, activityData]) => {
        if (!active) return;
        setProfile(profileData);
        setActivity(activityData);
      }
    );
    return () => {
      active = false;
    };
  }, [user]);

  async function handleSave(payload: ProfileUpdatePayload) {
    setSaving(true);
    try {
      setProfile(await profileService.updateProfile(user, payload));
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return <div className="border border-[#30363D] bg-[#161B22] p-6 text-xs text-[#666666]">Loading profile...</div>;
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <ProfileSidebar user={user} profile={profile} saving={saving} onSave={handleSave} />

      <div className="min-w-0 flex-1 space-y-5">
        <Tabs tabs={SECTIONS} active={section} onChange={onSectionChange} />
        {section === 'overview' && <ProfileOverview profile={profile} activity={activity} />}
        {section === 'workspaces' && <ProfileWorkspacesSection user={user} nav={nav} />}
        {section === 'projects' && <ProfileProjectsSection nav={nav} />}
        {section === 'accounts' && (
          <Panel title="Connected accounts" description="Link Google or GitHub to sign in to Orbit.">
            <SocialAccountsPanel />
          </Panel>
        )}
      </div>
    </div>
  );
}
