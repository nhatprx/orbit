import { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  GitBranch,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Presentation,
  Shield,
  Terminal,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { AuthSession } from '../../types/auth.types';
import type { WorkspaceAreaId } from '../../types/dashboard.types';
import { AdminOverview } from './AdminOverview';
import { UserOverview } from './UserOverview';

interface DashboardShellProps {
  session: AuthSession;
  onNavigateHome: () => void;
  onLogout: () => void;
}

interface NavItem {
  id: WorkspaceAreaId;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'git', label: 'Git', icon: GitBranch },
  { id: 'mail', label: 'Mail', icon: Mail },
  { id: 'docs', label: 'Docs', icon: FileText },
  { id: 'sheets', label: 'Sheets', icon: FileSpreadsheet },
  { id: 'ppt', label: 'Slides', icon: Presentation },
  { id: 'markdown', label: 'Markdown', icon: Terminal },
  { id: 'admin', label: 'Admin', icon: Shield, adminOnly: true },
];

export function DashboardShell({
  session,
  onNavigateHome,
  onLogout,
}: DashboardShellProps) {
  const [active, setActive] = useState<WorkspaceAreaId>('overview');
  const { user } = session;

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user.role === 'admin'
  );

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-[#F5F5F5]">
      <aside className="flex w-14 flex-col items-center border-r border-[#1F1F1F] bg-[#0A0A0A] py-3">
        <button
          type="button"
          title="Home"
          onClick={onNavigateHome}
          className="mb-4 flex h-8 w-8 items-center justify-center border border-[#22C55E] bg-[#052E16] font-mono text-xs font-semibold text-[#22C55E]"
        >
          OR
        </button>

        <nav className="flex flex-1 flex-col gap-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const selected = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => setActive(item.id)}
                className={`flex h-10 w-10 items-center justify-center border transition-colors ${
                  selected
                    ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                    : 'border-transparent text-[#A3A3A3] hover:border-[#1F1F1F] hover:bg-[#111111] hover:text-[#F5F5F5]'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          title="Sign Out"
          onClick={onLogout}
          className="flex h-10 w-10 items-center justify-center border border-transparent text-[#A3A3A3] hover:border-[#EF4444] hover:text-[#EF4444]"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#1F1F1F] bg-[#0A0A0A] px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight">ORBIT</span>
            <span className="font-mono text-xs text-[#666666]">/</span>
            <span className="font-mono text-xs uppercase text-[#22C55E]">
              {active}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Badge tone={user.role === 'admin' ? 'green' : 'neutral'} withDot>
              {user.role}
            </Badge>
            <span className="hidden text-xs text-[#A3A3A3] sm:inline">
              {user.email}
            </span>
            <Button variant="ghost" onClick={onNavigateHome}>
              <Home className="h-3.5 w-3.5" strokeWidth={1.5} />
              Home
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl">
            {active === 'overview' && (
              <UserOverview user={user} onSelectArea={setActive} />
            )}
            {active === 'admin' && <AdminOverview user={user} />}
            {active !== 'overview' && active !== 'admin' && (
              <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-8">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#22C55E]" />
                  <h2 className="text-base font-semibold uppercase text-[#F5F5F5]">
                    {active} Workspace Area
                  </h2>
                </div>
                <p className="text-xs text-[#A3A3A3]">
                  Module UI mockup placeholder. Feature scope will be finalized
                  during Phase 1 review.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
