import { useState } from 'react';
import type { AuthSession } from '../../types/auth.types';
import type { WorkspaceAreaId } from '../../types/dashboard.types';
import { AdminOverview } from './AdminOverview';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { UserOverview } from './UserOverview';
import { ProfilePage } from '../profile/ProfilePage';

interface DashboardShellProps {
  session: AuthSession;
  onNavigateHome: () => void;
  onLogout: () => void;
}

export function DashboardShell({
  session,
  onNavigateHome,
  onLogout,
}: DashboardShellProps) {
  const [active, setActive] = useState<WorkspaceAreaId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = session;

  return (
    <div className="flex h-screen w-screen flex-col bg-[#050505] text-[#F5F5F5]">
      <DashboardHeader
        user={user}
        active={active}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onSelectArea={setActive}
        onNavigateHome={onNavigateHome}
        onLogout={onLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          user={user}
          active={active}
          open={sidebarOpen}
          onSelectArea={setActive}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl">
            {active === 'overview' && (
              <UserOverview user={user} onSelectArea={setActive} />
            )}
            {active === 'profile' && <ProfilePage user={user} />}
            {active === 'admin' && <AdminOverview user={user} />}
            {active !== 'overview' && active !== 'profile' && active !== 'admin' && (
              <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-8">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#22C55E]" />
                  <h2 className="text-base font-semibold uppercase text-[#F5F5F5]">
                    {active} Workspace Area
                  </h2>
                </div>
                <p className="text-xs text-[#A3A3A3]">
                  Workspace environment initialized and ready.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
