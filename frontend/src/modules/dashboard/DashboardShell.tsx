import { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboard.service';
import type { AuthSession } from '../../types/auth.types';
import type { UserWorkspace, WorkspaceAreaId } from '../../types/dashboard.types';
import { CommunityChatPage } from '../chat/CommunityChatPage';
import { CloudFilesPage } from '../cloud/CloudFilesPage';
import { GitPage } from '../git/GitPage';
import { MailPage } from '../mail/MailPage';
import { ProfilePage } from '../profile/ProfilePage';
import { AdminOverview } from './AdminOverview';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { UserOverview } from './UserOverview';

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
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    session.user.workspaceId
  );

  useEffect(() => {
    let mounted = true;
    dashboardService.getUserWorkspaces(20).then((items) => {
      if (!mounted) return;
      setWorkspaces(items);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const currentUser = {
    ...session.user,
    workspaceId: activeWorkspaceId,
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0D1117] text-[#E6EDF3]">
      <DashboardHeader
        user={currentUser}
        active={active}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onSelectArea={setActive}
        onNavigateHome={onNavigateHome}
        onLogout={onLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          user={currentUser}
          active={active}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          open={sidebarOpen}
          onSelectArea={setActive}
          onSelectWorkspace={setActiveWorkspaceId}
        />

        <main
          className={
            active === 'mail' || active === 'cloud' || active === 'chat'
              ? 'flex-1 overflow-hidden'
              : 'flex-1 overflow-y-auto p-6'
          }
        >
          {active === 'mail' ? (
            <MailPage user={currentUser} />
          ) : active === 'cloud' ? (
            <CloudFilesPage user={currentUser} />
          ) : active === 'chat' ? (
            <CommunityChatPage user={currentUser} />
          ) : (
            <div className="mx-auto max-w-5xl">
              {active === 'overview' && (
                <UserOverview user={currentUser} onSelectArea={setActive} />
              )}
              {active === 'git' && <GitPage workspaceId={activeWorkspaceId} />}
              {active === 'profile' && <ProfilePage user={currentUser} />}
              {active === 'admin' && <AdminOverview user={currentUser} />}
              {active !== 'overview' &&
                active !== 'git' &&
                active !== 'profile' &&
                active !== 'admin' && (
                  <div className="border border-[#30363D] bg-[#161B22] p-8">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-[#22C55E]" />
                      <h2 className="text-lg font-semibold uppercase text-[#E6EDF3]">
                        {active} Workspace Area
                      </h2>
                    </div>
                    <p className="text-sm text-[#BDBDBD]">
                      Workspace environment initialized and ready for{' '}
                      <span className="font-mono text-[#22C55E]">
                        {activeWorkspaceId}
                      </span>
                      .
                    </p>
                  </div>
                )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
