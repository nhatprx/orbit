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
  'flex h-8 w-8 items-center justify-center border border-[#2E2E2E] bg-[#0A0A0A] text-[#A3A3A3] transition-colors hover:border-[#22C55E] hover:text-[#F5F5F5]';

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
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#1F1F1F] bg-[#0A0A0A] px-4">
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
          className="flex items-center gap-2 text-[#F5F5F5] hover:text-[#22C55E]"
        >
          <Orbit className="h-5 w-5 text-[#22C55E]" strokeWidth={1.5} />
          <span className="text-sm font-semibold tracking-tight">ORBIT</span>
        </button>

        <span className="font-mono text-xs text-[#666666]">/</span>
        <span className="text-xs font-medium capitalize text-[#F5F5F5]">
          {active === 'overview' ? 'Dashboard' : active}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center border border-[#2E2E2E] bg-[#050505] px-2.5 focus-within:border-[#22C55E] md:flex">
          <Search className="h-3.5 w-3.5 text-[#666666]" strokeWidth={1.5} />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type / to search"
            className="h-8 w-44 bg-transparent px-2 text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none lg:w-56"
          />
          <kbd className="border border-[#2E2E2E] px-1.5 py-0.5 font-mono text-[10px] text-[#666666]">
            /
          </kbd>
        </div>

        <div className="hidden h-5 w-px bg-[#1F1F1F] sm:block" />

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
          title="Docs"
          onClick={() => onSelectArea('docs')}
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
