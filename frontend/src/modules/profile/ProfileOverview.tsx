import type { AuthUser, UserActivitySummary } from '../../types/auth.types';
import type { ProjectDto } from '../../types/workspace.types';
import type { DashboardNavigation } from '../dashboard/useDashboardNavigation';
import { ProfileActivityOverview } from './ProfileActivityOverview';
import { ProfileIntroductionCard } from './ProfileIntroductionCard';
import { ProfilePinnedSection } from './ProfilePinnedSection';

interface ProfileOverviewProps {
  user: AuthUser;
  projects: ProjectDto[];
  activitySummary: UserActivitySummary | null;
  activityLoading: boolean;
  nav: DashboardNavigation;
  onSaveIntroduction: (introduction: string) => Promise<void>;
  onSavePins: (pinnedProjectIds: string[]) => Promise<void>;
}

export function ProfileOverview({
  user,
  projects,
  activitySummary,
  activityLoading,
  nav,
  onSaveIntroduction,
  onSavePins,
}: ProfileOverviewProps) {
  return (
    <div className="space-y-5">
      <ProfileIntroductionCard
        introduction={user.introduction}
        onSave={onSaveIntroduction}
      />

      <ProfilePinnedSection
        projects={projects}
        pinnedIds={user.pinnedProjectIds ?? []}
        nav={nav}
        onSavePins={onSavePins}
      />

      <ProfileActivityOverview
        summary={activitySummary}
        loading={activityLoading}
      />
    </div>
  );
}
