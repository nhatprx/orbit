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
  active: WorkspaceAreaId;
  onToggleSidebar: () => void;
  onSelectArea: (area: WorkspaceAreaId) => void;
  onNavigateHome: () => void;
  onLogout: () => void;
}

const ICON_BTN =
  'flex h-9 w-9 items-center justify-center border border-[#3B434B] bg-[#161B22] text-[#BDBDBD] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3]';

export function DashboardHeader({
  user,
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
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#30363D] bg-[#161B22] px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          title="Toggle navigation"
          onClick={onToggleSidebar}
          className={ICON_BTN}
        >
          <Menu className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={() => onSelectArea('overview')}
          className="flex items-center gap-2 text-[#E6EDF3] hover:text-[#22C55E]"
        >
          <Orbit className="h-5 w-5 text-[#22C55E]" strokeWidth={1.5} />
          <span className="text-base font-semibold tracking-tight">ORBIT</span>
        </button>

        <span className="font-mono text-sm text-[#8A8A8A]">/</span>
        <span className="text-sm font-medium capitalize text-[#E6EDF3]">
          {active === 'overview'
            ? 'Dashboard'
            : active === 'cloud'
              ? 'Cloud Files'
              : active === 'chat'
                ? 'Community Chat'
                : active}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center border border-[#3B434B] bg-[#0D1117] px-3 focus-within:border-[#22C55E] md:flex">
          <Search className="h-4 w-4 text-[#8A8A8A]" strokeWidth={1.5} />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type / to search"
            className="h-9 w-48 bg-transparent px-2.5 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:outline-none lg:w-64"
          />
          <kbd className="border border-[#3B434B] px-1.5 py-0.5 font-mono text-xs text-[#8A8A8A]">
            /
          </kbd>
        </div>

        <div className="hidden h-5 w-px bg-[#30363D] sm:block" />

        <HeaderCreateMenu onSelectArea={onSelectArea} />

        <button
          type="button"
          title="Workspace Overview"
          onClick={() => onSelectArea('overview')}
          className={`hidden sm:flex ${ICON_BTN}`}
        >
          <CircleDot className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          title="Git"
          onClick={() => onSelectArea('git')}
          className={`hidden sm:flex ${ICON_BTN}`}
        >
          <GitPullRequest className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          title="Cloud Files"
          onClick={() => onSelectArea('cloud')}
          className={`hidden sm:flex ${ICON_BTN}`}
        >
          <BookMarked className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          title="Mail & Notifications"
          onClick={() => onSelectArea('mail')}
          className={`relative ${ICON_BTN}`}
        >
          <Inbox className="h-4 w-4" strokeWidth={1.5} />
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
