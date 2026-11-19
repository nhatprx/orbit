import { useEffect, useState } from 'react';
import { ArrowUpRight, FolderPlus, Settings } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { dashboardService } from '../../services/dashboard.service';
import type { AuthUser } from '../../types/auth.types';
import type { ActivityRecord } from '../../types/dashboard.types';
import type { OrbitProject, OrbitWorkspace } from '../../types/workspace.types';

interface UserOverviewProps {
  user: AuthUser;
  workspace: OrbitWorkspace | null;
  projects: OrbitProject[];
  onOpenProject: (project: OrbitProject) => void;
  onOpenProjectSettings: (project: OrbitProject) => void;
  onOpenCreateProject: () => void;
}

export function UserOverview({
  user,
  workspace,
  projects,
  onOpenProject,
  onOpenProjectSettings,
  onOpenCreateProject,
}: UserOverviewProps) {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);

  useEffect(() => {
    let active = true;
    dashboardService.getRecentActivity(5).then((items) => {
      if (active) setActivity(items);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#30363D] bg-[#161B22] p-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#E6EDF3]">
            {workspace?.name ?? 'Orbit Workspace'}
          </h2>
          <p className="mt-1 text-sm text-[#BDBDBD]">
            {projects.length} projects — {workspace?.memberCount ?? 1} workspace members
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="green" withDot>
            ROLE: {user.role.toUpperCase()}
          </Badge>
          <Button type="button" variant="primary" onClick={onOpenCreateProject}>
            <FolderPlus className="h-4 w-4" strokeWidth={1.5} />
            Create Project
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">
          Projects in this Workspace
        </h3>
        <div className="grid grid-cols-1 gap-px border border-[#30363D] bg-[#30363D] md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col justify-between bg-[#161B22] p-5"
            >
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenProject(project)}
                    className="flex items-center gap-1.5 text-base font-semibold text-[#E6EDF3] hover:text-[#22C55E]"
                  >
                    <span>{project.name}</span>
                    <ArrowUpRight className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    title="Project Settings & Modules"
                    onClick={() => onOpenProjectSettings(project)}
                    className="text-[#8A8A8A] hover:text-[#22C55E]"
                  >
                    <Settings className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
                <p className="mb-4 text-sm text-[#BDBDBD]">{project.description}</p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {project.enabledModules.map((mod) => (
                    <Badge key={mod} tone="green">
                      {mod}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-[#30363D] pt-2.5 font-mono text-xs text-[#8A8A8A]">
                  <span>{project.memberCount} members</span>
                  <span>{project.updatedAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">
          Recent Workspace Activity
        </h3>
        <div className="border border-[#30363D] bg-[#161B22]">
          {activity.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-5 py-3.5 text-sm ${
                idx > 0 ? 'border-t border-[#30363D]' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-[#22C55E]" />
                <span className="font-medium text-[#E6EDF3]">{item.actor}</span>
                <span className="text-[#BDBDBD]">{item.action}</span>
              </div>
              <span className="font-mono text-xs text-[#8A8A8A]">{item.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
