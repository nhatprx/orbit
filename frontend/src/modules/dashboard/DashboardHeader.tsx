import { useEffect, useRef, useState } from 'react';
import {
  BookMarked,
  CircleDot,
  GitPullRequest,
  Inbox,
  Menu,
  Orbit,
  Search,
} from 'lucide-react';
import type { AuthUser } from '../../types/auth.types';
import type { WorkspaceAreaId } from '../../types/dashboard.types';
import { HeaderProfileMenu } from './HeaderProfileMenu';
import { HeaderCreateMenu } from './HeaderUserMenu';

interface DashboardHeaderProps {
  user: AuthUser;
  workspaceName: string;
  projectName: string;
  active: WorkspaceAreaId;
  onToggleSidebar: () => void;
  onSelectArea: (area: WorkspaceAreaId) => void;
  onNavigateHome: () => void;
  onLogout: () => void;
}

const ICON_BTN =
  'flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8B949E] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3]';

export function DashboardHeader({
  user,
  workspaceName,
  projectName,
  active,
  onToggleSidebar,
  onSelectArea,
  onNavigateHome,
  onLogout,
}: DashboardHeaderProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center justify-between border-b border-[#30363D] bg-[#161B22] px-3.5">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          title="Toggle navigation"
          onClick={onToggleSidebar}
          className={ICON_BTN}
        >
          <Menu className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={() => onSelectArea('overview')}
          className="flex items-center gap-1.5 text-[#E6EDF3] hover:text-[#22C55E]"
        >
          <Orbit className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <span className="text-[13px] font-semibold tracking-tight">ORBIT</span>
        </button>

        <span className="hidden font-mono text-xs text-[#7D8590] sm:inline">/</span>
        <span className="hidden text-[13px] text-[#8B949E] sm:inline">{workspaceName}</span>
        {projectName && active !== 'overview' && active !== 'ai' && active !== 'admin' && active !== 'profile' && (
          <>
            <span className="hidden font-mono text-xs text-[#7D8590] md:inline">/</span>
            <span className="hidden text-[13px] text-[#8B949E] md:inline">{projectName}</span>
          </>
        )}
        <span className="font-mono text-xs text-[#7D8590]">/</span>
        <span className="text-[13px] font-medium capitalize text-[#E6EDF3]">
          {active === 'overview'
            ? 'Workspace'
            : active === 'ai'
              ? 'AI Chat'
              : active === 'cloud'
                ? 'Cloud Files'
                : active === 'chat'
                  ? 'Community Chat'
                  : active === 'project-settings'
                    ? 'Project Settings'
                    : active}
        </span>
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
          <kbd className="border border-[#30363D] px-1 py-0.2 font-mono text-[10px] text-[#7D8590]">
            /
          </kbd>
        </div>

        <div className="hidden h-4 w-px bg-[#30363D] sm:block" />

        <HeaderCreateMenu onSelectArea={onSelectArea} />

        <button
          type="button"
          title="Workspace Overview"
          onClick={() => onSelectArea('overview')}
          className={`hidden sm:flex ${ICON_BTN}`}
        >
          <CircleDot className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          title="Git"
          onClick={() => onSelectArea('git')}
          className={`hidden sm:flex ${ICON_BTN}`}
        >
          <GitPullRequest className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          title="Cloud Files"
          onClick={() => onSelectArea('cloud')}
          className={`hidden sm:flex ${ICON_BTN}`}
        >
          <BookMarked className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          title="Mail & Notifications"
          onClick={() => onSelectArea('mail')}
          className={`relative ${ICON_BTN}`}
        >
          <Inbox className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 bg-[#22C55E]" />
        </button>

        <HeaderProfileMenu
          user={user}
          onSelectArea={onSelectArea}
          onNavigateHome={onNavigateHome}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
