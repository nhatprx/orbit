import { useState, type FormEvent } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ALL_PROJECT_MODULES } from '../../mocks/workspace.mock';
import type {
  CreateProjectPayload,
  ProjectModuleId,
} from '../../types/workspace.types';

interface CreateProjectModalProps {
  open: boolean;
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
  onCreate: (payload: CreateProjectPayload) => Promise<void>;
}

const INPUT_CLASS =
  'w-full border border-[#3B434B] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none';

export function CreateProjectModal({
  open,
  workspaceId,
  workspaceName,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modules, setModules] = useState<ProjectModuleId[]>([
    'git',
    'mail',
    'cloud',
  ]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function toggleModule(id: ProjectModuleId) {
    setModules((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        workspaceId,
        name,
        description,
        enabledModules: modules,
      });
      setName('');
      setDescription('');
      setModules(['git', 'mail', 'cloud']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg border border-[#3B434B] bg-[#161B22]">
        <div className="flex items-center justify-between border-b border-[#30363D] px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#E6EDF3]">
              Create Project
            </h2>
            <p className="mt-0.5 font-mono text-xs text-[#8A8A8A]">
              Workspace: {workspaceName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8A8A8A] hover:text-[#E6EDF3]"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs text-[#BDBDBD]">Project Name</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project Delta"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#BDBDBD]">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this project environment"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs text-[#BDBDBD]">
              Enabled Modules ({modules.length} selected)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PROJECT_MODULES.map((mod) => {
                const enabled = modules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-center justify-between border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      enabled
                        ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                        : 'border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:border-[#3B434B]'
                    }`}
                  >
                    <span>{mod.label}</span>
                    <span
                      className={`h-1.5 w-1.5 ${
                        enabled ? 'bg-[#22C55E]' : 'bg-[#3B434B]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              <FolderPlus className="h-4 w-4" strokeWidth={1.5} />
              {saving ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
