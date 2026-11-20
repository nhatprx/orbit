import { useState, type FormEvent } from 'react';
import { FolderPlus } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import type { CreateProjectRequest, ModuleKey } from '../../types/workspace.types';
import { MODULE_META, orderModules } from './moduleMeta';

interface CreateProjectModalProps {
  open: boolean;
  workspaceName: string;
  inheritedModules: ModuleKey[];
  onClose: () => void;
  onCreate: (request: CreateProjectRequest) => Promise<void>;
}

/** New projects copy every module enabled on the Workspace (O-11); they can be trimmed afterwards. */
export function CreateProjectModal({
  open,
  workspaceName,
  inheritedModules,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const create = useAsyncAction(async (request: CreateProjectRequest) => {
    await onCreate(request);
    setName('');
    setDescription('');
    onClose();
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Project name is required.');
      return;
    }
    setNameError(null);
    const desc = description.trim();
    await create.run({ name: trimmed, ...(desc ? { description: desc } : {}) });
  }

  return (
    <Modal open={open} title="Create Project" subtitle={`Workspace: ${workspaceName}`} onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <TextField
          label="Project name"
          autoFocus
          maxLength={100}
          value={name}
          error={nameError}
          placeholder="Project Delta"
          onChange={(e) => setName(e.target.value)}
        />
        <TextAreaField
          label="Description (optional)"
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div>
          <p className="mb-1.5 text-xs text-[#BDBDBD]">Modules inherited from the workspace</p>
          <div className="flex flex-wrap gap-1.5">
            {orderModules(inheritedModules).map((key) => (
              <Badge key={key} tone="green">
                {MODULE_META[key].label}
              </Badge>
            ))}
            {inheritedModules.length === 0 && <span className="text-xs text-[#7D8590]">No modules enabled.</span>}
          </div>
        </div>
        {create.error && (
          <p role="alert" className="text-xs text-[#EF4444]">
            {create.error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={create.pending}>
            <FolderPlus className="h-4 w-4" strokeWidth={1.5} />
            {create.pending ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
