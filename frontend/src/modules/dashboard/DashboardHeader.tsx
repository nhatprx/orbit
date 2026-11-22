import { useEffect, useRef, useState } from 'react';
import { Cloud, Inbox, Menu, Orbit, Search } from 'lucide-react';
import type { AuthUser } from '../../types/auth.types';
import type { WorkspaceAreaId } from '../../types/dashboard.types';
import { HeaderBreadcrumb } from './HeaderBreadcrumb';
import { HeaderProfileMenu } from './HeaderProfileMenu';
import { HeaderCreateMenu } from './HeaderUserMenu';
import { DashboardNotificationsMenu } from './DashboardNotificationsMenu';
import type { NotificationDto } from '../../services/notifications.service';
import type { DashboardNavigation } from './useDashboardNavigation';

interface DashboardHeaderProps {
  user: AuthUser;
  workspaceName: string | null;
  projectName: string | null;
  nav: DashboardNavigation;
  canCreateProject: boolean;
  onToggleSidebar: () => void;
  onCreateWorkspace: () => void;
  onCreateProject: () => void;
  onNavigateHome: () => void;
  onLogout: () => void;
  onInviteAccepted: (workspaceId: string, projectId: string | null) => Promise<void>;
  onOpenIssue: (notification: NotificationDto) => Promise<void>;
}

const ICON_BTN =
  'flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8B949E] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3]';

export function DashboardHeader({
  user,
  workspaceName,
  projectName,
  nav,
  canCreateProject,
  onToggleSidebar,
  onCreateWorkspace,
  onCreateProject,
  onNavigateHome,
  onLogout,
  onInviteAccepted,
  onOpenIssue,
}: DashboardHeaderProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const select = (area: WorkspaceAreaId) => nav.go(area);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (event.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center justify-between border-b border-[#30363D] bg-[#161B22] px-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <button type="button" title="Toggle navigation" onClick={onToggleSidebar} className={ICON_BTN}>
          <Menu className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={() => select('overview')}
          className="flex items-center gap-1.5 text-[#E6EDF3] hover:text-[#22C55E]"
        >
          <Orbit className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <span className="text-[13px] font-semibold tracking-tight">ORBIT</span>
        </button>

        <HeaderBreadcrumb active={nav.active} workspaceName={workspaceName} projectName={projectName} />
      </div>

      <div className="flex items-center gap-1.5">
        <div className="hidden items-center border border-[#30363D] bg-[#0D1117] px-2 focus-within:border-[#22C55E] md:flex">
          <Search className="h-3.5 w-3.5 text-[#7D8590]" strokeWidth={1.5} />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type / to search"
            className="h-7 w-40 bg-transparent px-2 text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:outline-none lg:w-52"
          />
          <kbd className="border border-[#30363D] px-1 font-mono text-[10px] text-[#7D8590]">/</kbd>
        </div>

        <div className="hidden h-4 w-px bg-[#30363D] sm:block" />

        <HeaderCreateMenu
          canCreateProject={canCreateProject}
          onCreateWorkspace={onCreateWorkspace}
          onCreateProject={onCreateProject}
          onComposeMail={() => select('mail')}
        />

        <button
          type="button"
          title="Personal Cloud Files"
          aria-label="Open Personal Cloud Files"
          onClick={() => select('personal-cloud')}
          className={`${ICON_BTN} ${nav.active === 'personal-cloud' ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]' : ''}`}
        >
          <Cloud className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          title="Mails"
          aria-label="Open Mails"
          onClick={() => select('mail')}
          className={`${ICON_BTN} ${nav.active === 'mail' ? 'border-[#22C55E] text-[#22C55E]' : ''}`}
        >
          <Inbox className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        <DashboardNotificationsMenu onInviteAccepted={onInviteAccepted} onOpenIssue={onOpenIssue} />

        <HeaderProfileMenu
          user={user}
          onSelectArea={select}
          onOpenProfile={nav.openProfile}
          onNavigateHome={onNavigateHome}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
