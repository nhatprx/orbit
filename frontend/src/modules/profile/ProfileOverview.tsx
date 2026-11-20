import { BookMarked } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { ActivityRecord } from '../../types/dashboard.types';
import type { ProfileData } from '../../types/profile.types';
import { ContributionGrid } from './ContributionGrid';

interface ProfileOverviewProps {
  profile: ProfileData;
  activity: ActivityRecord[];
}

export function ProfileOverview({ profile, activity }: ProfileOverviewProps) {
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">Pinned</h2>
          <span className="font-mono text-[11px] text-[#666666]">{profile.pinned.length} ITEMS</span>
        </div>

        <div className="grid grid-cols-1 gap-px border border-[#30363D] bg-[#30363D] md:grid-cols-2">
          {profile.pinned.map((item) => (
            <div key={item.id} className="flex flex-col justify-between bg-[#161B22] p-5">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#E6EDF3]">
                    <BookMarked className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
                    <span>{item.name}</span>
                  </div>
                  <Badge tone="neutral">{item.area}</Badge>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-[#BDBDBD]">{item.description}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-[#8A8A8A]">
                <span className="flex items-center gap-1.5 font-mono text-[#BDBDBD]">
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
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">Recent Activity</h2>
        <div className="border border-[#30363D] bg-[#161B22]">
          {activity.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-4 px-5 py-3.5 text-sm ${idx > 0 ? 'border-t border-[#30363D]' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 shrink-0 bg-[#22C55E]" />
                <span className="font-mono text-xs text-[#22C55E]">{item.area}</span>
                <span className="text-[#E6EDF3]">{item.action}</span>
              </div>
              <span className="shrink-0 font-mono text-xs text-[#8A8A8A]">{item.timestamp}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
