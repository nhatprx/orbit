import { useState } from 'react';
import {
  FolderGit2,
  GitBranch,
  HardDrive,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Shield,
} from 'lucide-react';
import type { AuthUser } from '../../types/auth.types';
import type { UserWorkspace, WorkspaceAreaId } from '../../types/dashboard.types';

interface DashboardSidebarProps {
  user: AuthUser;
  active: WorkspaceAreaId;
  workspaces: UserWorkspace[];
  activeWorkspaceId: string;
  open: boolean;
  onSelectArea: (area: WorkspaceAreaId) => void;
  onSelectWorkspace: (workspaceId: string) => void;
}

interface NavItem {
  id: WorkspaceAreaId;
  label: string;
  icon: typeof LayoutDashboard;
}

const MAIN_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'git', label: 'Git', icon: GitBranch },
  { id: 'mail', label: 'Mail', icon: Mail },
  { id: 'cloud', label: 'Cloud Files', icon: HardDrive },
  { id: 'chat', label: 'Community Chat', icon: MessageSquare },
];

export function DashboardSidebar({
  user,
  active,
  workspaces,
  activeWorkspaceId,
  open,
  onSelectArea,
  onSelectWorkspace,
}: DashboardSidebarProps) {
  const [filter, setFilter] = useState('');

  if (!open) return null;

  const filteredWorkspaces = workspaces.filter(
    (ws) =>
      ws.name.toLowerCase().includes(filter.toLowerCase()) ||
      ws.slug.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22]">
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">
            Your Workspaces
          </p>
          <button
            type="button"
            onClick={() => onSelectArea('git')}
            className="inline-flex items-center gap-1 border border-[#22C55E] bg-[#052E16] px-2 py-1 text-xs font-medium text-[#22C55E] hover:bg-[#22C55E] hover:text-[#0D1117]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            New
          </button>
        </div>

        <div className="mb-3 flex items-center border border-[#3B434B] bg-[#0D1117] px-2.5 focus-within:border-[#22C55E]">
          <Search className="h-3.5 w-3.5 text-[#8A8A8A]" strokeWidth={1.5} />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find a workspace..."
            className="h-8 w-full bg-transparent px-2 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          {filteredWorkspaces.map((ws) => {
            const isCurrent = ws.id === activeWorkspaceId;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => onSelectWorkspace(ws.id)}
                className={`flex w-full items-center justify-between border px-2.5 py-2 text-left text-sm transition-colors ${
                  isCurrent
                    ? 'border-[#22C55E] bg-[#052E16] text-[#E6EDF3]'
                    : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <FolderGit2
                    className={`h-4 w-4 shrink-0 ${
                      isCurrent ? 'text-[#22C55E]' : 'text-[#8A8A8A]'
                    }`}
                    strokeWidth={1.5}
                  />
                  <span className="truncate font-mono text-xs">{ws.slug}</span>
                </span>
                {isCurrent && <span className="h-1.5 w-1.5 shrink-0 bg-[#22C55E]" />}
              </button>
            );
          })}
          {filteredWorkspaces.length === 0 && (
            <p className="px-2 py-2 text-xs text-[#8A8A8A]">No matching workspaces.</p>
          )}
        </div>

        <div className="mt-6 border-t border-[#30363D] pt-4">
          <p className="mb-2 px-2 font-mono text-xs uppercase tracking-wider text-[#8A8A8A]">
            Modules
          </p>
          <nav className="space-y-1">
            {MAIN_ITEMS.map((item) => {
              const Icon = item.icon;
              const selected = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectArea(item.id)}
                  className={`flex w-full items-center gap-3 border px-3 py-2 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                      : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {user.role === 'admin' && (
          <div className="mt-5 border-t border-[#30363D] pt-4">
            <p className="mb-2 px-2 font-mono text-xs uppercase tracking-wider text-[#8A8A8A]">
              Administration
            </p>
            <button
              type="button"
              onClick={() => onSelectArea('admin')}
              className={`flex w-full items-center gap-3 border px-3 py-2 text-sm font-medium transition-colors ${
                active === 'admin'
                  ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                  : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>Admin Console</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
