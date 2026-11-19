import { useEffect, useState } from 'react';
import { BookMarked } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { dashboardService } from '../../services/dashboard.service';
import { profileService } from '../../services/profile.service';
import type { AuthUser } from '../../types/auth.types';
import type { ActivityRecord } from '../../types/dashboard.types';
import type { ProfileData, ProfileUpdatePayload } from '../../types/profile.types';
import { ContributionGrid } from './ContributionGrid';
import { ProfileSidebar } from './ProfileSidebar';

interface ProfilePageProps {
  user: AuthUser;
}

export function ProfilePage({ user }: ProfilePageProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      profileService.getProfile(user),
      dashboardService.getRecentActivity(6),
    ]).then(([profileData, activityData]) => {
      if (!active) return;
      setProfile(profileData);
      setActivity(activityData);
    });
    return () => {
      active = false;
    };
  }, [user]);

  async function handleSave(payload: ProfileUpdatePayload) {
    setSaving(true);
    try {
      const updated = await profileService.updateProfile(user, payload);
      setProfile(updated);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-6 text-xs text-[#666666]">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <ProfileSidebar
        user={user}
        profile={profile}
        saving={saving}
        onSave={handleSave}
      />

      <div className="min-w-0 flex-1 space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
              Pinned
            </h2>
            <span className="font-mono text-[11px] text-[#666666]">
              {profile.pinned.length} ITEMS
            </span>
          </div>

          <div className="grid grid-cols-1 gap-px border border-[#1F1F1F] bg-[#1F1F1F] md:grid-cols-2">
            {profile.pinned.map((item) => (
              <div key={item.id} className="flex flex-col justify-between bg-[#0A0A0A] p-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#F5F5F5]">
                      <BookMarked className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
                      <span>{item.name}</span>
                    </div>
                    <Badge tone="neutral">{item.area}</Badge>
                  </div>
                  <p className="mb-4 text-xs leading-relaxed text-[#A3A3A3]">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#666666]">
                  <span className="flex items-center gap-1.5 font-mono text-[#A3A3A3]">
                    <span className="h-1.5 w-1.5 bg-[#22C55E]" />
                    {item.tag}
                  </span>
                  <span className="font-mono">{item.updatedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <ContributionGrid weeks={profile.contributions} />

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
            Recent Activity
          </h2>
          <div className="border border-[#1F1F1F] bg-[#0A0A0A]">
            {activity.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-4 px-4 py-3 text-xs ${
                  idx > 0 ? 'border-t border-[#1F1F1F]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 shrink-0 bg-[#22C55E]" />
                  <span className="font-mono text-[#22C55E]">{item.area}</span>
                  <span className="text-[#F5F5F5]">{item.action}</span>
                </div>
                <span className="shrink-0 font-mono text-[#666666]">
                  {item.timestamp}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
