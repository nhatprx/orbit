import { Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ALL_PROJECT_MODULES } from '../../mocks/workspace.mock';
import type { OrbitProject, ProjectModuleId } from '../../types/workspace.types';

interface ProjectSettingsViewProps {
  project: OrbitProject;
  canDelete: boolean;
  onToggleModule: (projectId: string, moduleId: ProjectModuleId) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectSettingsView({
  project,
  canDelete,
  onToggleModule,
  onDeleteProject,
}: ProjectSettingsViewProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#30363D] bg-[#161B22] p-4">
        <div>
          <h1 className="text-base font-semibold text-[#E6EDF3]">
            {project.name} — Settings & Modules
          </h1>
          <p className="mt-0.5 text-[13px] text-[#8B949E]">{project.description}</p>
        </div>
        <Badge tone="green" withDot>
          {project.enabledModules.length} MODULES ENABLED
        </Badge>
      </div>

      <section className="border border-[#30363D] bg-[#161B22]">
        <div className="border-b border-[#30363D] px-4 py-2.5">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
            Project Modules (Toggle Independently Per Project)
          </h2>
        </div>

        <div className="divide-y divide-[#30363D]">
          {ALL_PROJECT_MODULES.map((mod) => {
            const enabled = project.enabledModules.includes(mod.id);
            return (
              <div
                key={mod.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 ${
                        enabled ? 'bg-[#22C55E]' : 'bg-[#7D8590]'
                      }`}
                    />
                    <span className="text-[13px] font-semibold text-[#E6EDF3]">
                      {mod.label}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-3.5 text-xs text-[#8B949E]">
                    {mod.summary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleModule(project.id, mod.id)}
                  className={`border px-2.5 py-1 font-mono text-[11px] uppercase transition-colors ${
                    enabled
                      ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E] hover:bg-[#22C55E] hover:text-[#0D1117]'
                      : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#22C55E] hover:text-[#E6EDF3]'
                  }`}
                >
                  {enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {canDelete && (
        <section className="flex flex-wrap items-center justify-between gap-4 border border-[#EF4444] bg-[#161B22] p-5">
          <div>
            <h3 className="text-sm font-semibold text-[#EF4444]">
              Delete Project
            </h3>
            <p className="mt-0.5 text-xs text-[#BDBDBD]">
              Remove {project.name} from this workspace. This action cannot be undone.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onDeleteProject(project.id)}
            className="border-[#EF4444] text-[#EF4444] hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-[#0D1117]"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            Delete Project
          </Button>
        </section>
      )}
    </div>
  );
}
