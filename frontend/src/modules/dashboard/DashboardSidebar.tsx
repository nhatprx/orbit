import {
  FileSpreadsheet,
  FileText,
  GitBranch,
  LayoutDashboard,
  Mail,
  Presentation,
  Shield,
  Terminal,
} from 'lucide-react';
import type { AuthUser } from '../../types/auth.types';
import type { WorkspaceAreaId } from '../../types/dashboard.types';

interface DashboardSidebarProps {
  user: AuthUser;
  active: WorkspaceAreaId;
  open: boolean;
  onSelectArea: (area: WorkspaceAreaId) => void;
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
  { id: 'docs', label: 'Docs', icon: FileText },
  { id: 'sheets', label: 'Sheets', icon: FileSpreadsheet },
  { id: 'ppt', label: 'Presentations', icon: Presentation },
  { id: 'markdown', label: 'Markdown', icon: Terminal },
];

export function DashboardSidebar({
  user,
  active,
  open,
  onSelectArea,
}: DashboardSidebarProps) {
  if (!open) return null;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[#1F1F1F] bg-[#0A0A0A]">
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 font-mono text-[11px] uppercase tracking-wider text-[#666666]">
          Workspace
        </p>

        <nav className="space-y-0.5">
          {MAIN_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectArea(item.id)}
                className={`flex w-full items-center gap-2.5 border px-2.5 py-2 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                    : 'border-transparent text-[#A3A3A3] hover:border-[#1F1F1F] hover:bg-[#111111] hover:text-[#F5F5F5]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {user.role === 'admin' && (
          <div className="mt-6 border-t border-[#1F1F1F] pt-4">
            <p className="mb-2 px-2 font-mono text-[11px] uppercase tracking-wider text-[#666666]">
              Administration
            </p>
            <button
              type="button"
              onClick={() => onSelectArea('admin')}
              className={`flex w-full items-center gap-2.5 border px-2.5 py-2 text-xs font-medium transition-colors ${
                active === 'admin'
                  ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                  : 'border-transparent text-[#A3A3A3] hover:border-[#1F1F1F] hover:bg-[#111111] hover:text-[#F5F5F5]'
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>Admin Console</span>
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-[#1F1F1F] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 bg-[#22C55E]" />
          <span className="truncate font-mono text-[11px] text-[#A3A3A3]">
            {user.workspaceId}
          </span>
        </div>
      </div>
    </aside>
  );
}
