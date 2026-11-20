import { useState } from 'react';
import { ArrowUpRight, Check, FolderKanban, Pin } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { errorMessage } from '../../services/workspace/httpClient';
import type { ProjectDto } from '../../types/workspace.types';
import type { DashboardNavigation } from '../dashboard/useDashboardNavigation';
import { MODULE_META, orderModules } from '../workspace/moduleMeta';

interface ProfilePinnedSectionProps {
  projects: ProjectDto[];
  pinnedIds: string[];
  nav: DashboardNavigation;
  onSavePins: (ids: string[]) => Promise<void>;
}

const MAX_PINS = 6;

export function ProfilePinnedSection({
  projects,
  pinnedIds,
  nav,
  onSavePins,
}: ProfilePinnedSectionProps) {
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<string[]>(pinnedIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = new Map(projects.map((p) => [p.id, p]));
  const pinnedProjects = pinnedIds.map((id) => byId.get(id)).filter((p): p is ProjectDto => Boolean(p));

  function openManager() {
    setSelected(pinnedProjects.map((p) => p.id));
    setError(null);
    setManaging(true);
  }

  function toggleSelection(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= MAX_PINS) return prev;
      return [...prev, id];
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSavePins(selected);
      setManaging(false);
    } catch (err) {
      setError(errorMessage(err, 'Failed to update pinned projects.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border border-[#30363D] bg-[#161B22]">
      <div className="flex items-center justify-between border-b border-[#30363D] px-5 py-3">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
            Pinned Projects
          </h2>
          <span className="font-mono text-[11px] text-[#666666]">
            {pinnedProjects.length}/{MAX_PINS}
          </span>
        </div>

        {projects.length > 0 && !managing && (
          <button
            type="button"
            onClick={openManager}
            className="font-mono text-xs text-[#8B949E] transition-colors hover:text-[#22C55E]"
          >
            {pinnedProjects.length > 0 ? 'Customize pins' : 'Pin projects'}
          </button>
        )}
      </div>

      {managing ? (
        <div className="space-y-4 p-5">
          <p className="text-xs text-[#8B949E]">
            Select up to {MAX_PINS} projects to highlight on your profile.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {projects.map((project) => {
              const checked = selected.includes(project.id);
              const disabled = !checked && selected.length >= MAX_PINS;
              return (
                <button
                  key={project.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSelection(project.id)}
                  className={`flex items-center justify-between border px-3 py-2.5 text-left transition-colors ${
                    checked
                      ? 'border-[#22C55E] bg-[#052E16]/40 text-[#E6EDF3]'
                      : 'border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:border-[#8B949E]'
                  } disabled:opacity-40`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{project.name}</p>
                    <p className="truncate font-mono text-[11px] text-[#7D8590]">
                      {project.workspaceName}
                    </p>
                  </div>
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                      checked ? 'border-[#22C55E] bg-[#22C55E] text-[#0D1117]' : 'border-[#30363D]'
                    }`}
                  >
                    {checked && <Check className="h-3 w-3" strokeWidth={2.5} />}
                  </span>
                </button>
              );
            })}
          </div>
          {error && (
            <p role="alert" className="border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setManaging(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Saving...' : 'Save pins'}
            </Button>
          </div>
        </div>
      ) : pinnedProjects.length === 0 ? (
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-4 w-4 shrink-0 text-[#666666]" strokeWidth={1.5} />
            <p className="text-sm text-[#8B949E]">
              {projects.length > 0
                ? 'No projects pinned yet. Pin your key projects for quick access.'
                : 'Join or create a project to pin it on your profile.'}
            </p>
          </div>
          {projects.length > 0 && (
            <Button type="button" variant="secondary" onClick={openManager}>
              Pin projects
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-[#30363D] md:grid-cols-2">
          {pinnedProjects.map((project) => {
            const modules = orderModules(project.enabledModules);
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => void nav.openProjectIn(project.workspaceId, project.id, modules[0])}
                className="group flex flex-col justify-between bg-[#161B22] p-5 text-left transition-colors hover:bg-[#1C2128]"
              >
                <div className="w-full">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#7D8590]">
                      {project.workspaceName}
                    </span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 shrink-0 text-[#666666] transition-colors group-hover:text-[#22C55E]"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#E6EDF3] group-hover:text-[#22C55E]">
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#8B949E]">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {modules.map((key) => (
                    <Badge key={key} tone="green">
                      {MODULE_META[key].label}
                    </Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
