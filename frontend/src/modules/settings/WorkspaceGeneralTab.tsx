import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { toast } from '../../components/ui/toastStore';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { workspaceService } from '../../services/workspace/services';
import type { WorkspaceDto } from '../../types/workspace.types';
import { can } from './permissionCatalog';
import { isHttpUrl } from '../workspace/wizard/wizardValidation';

interface WorkspaceGeneralTabProps {
  workspace: WorkspaceDto;
  onChanged: () => Promise<void>;
}

export function WorkspaceGeneralTab({ workspace, onChanged }: WorkspaceGeneralTabProps) {
  const editable = can(workspace.myPermissions, 'workspace.edit');
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? '');
  const [avatarUrl, setAvatarUrl] = useState(workspace.avatarUrl ?? '');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const save = useAsyncAction(async () => {
    await workspaceService.updateWorkspace(workspace.id, {
      name: name.trim(),
      description: description.trim(),
      avatarUrl: avatarUrl.trim(),
    });
    await onChanged();
    toast.success('Workspace changes saved.');
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setFieldError('Workspace name is required.');
    if (avatarUrl.trim() && !isHttpUrl(avatarUrl.trim())) return setFieldError('Avatar must be an http or https URL.');
    setFieldError(null);
    await save.run();
  }

  return (
    <Panel title="Workspace details" description="Name, description, and avatar shown across Orbit.">
      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-xl space-y-4">
        <TextField label="Name" required maxLength={100} value={name} disabled={!editable} error={fieldError} onChange={(e) => setName(e.target.value)} />
        <TextAreaField label="Description" rows={3} maxLength={500} value={description} disabled={!editable} onChange={(e) => setDescription(e.target.value)} />
        <TextField label="Avatar URL" type="url" value={avatarUrl} disabled={!editable} placeholder="https://example.com/logo.png" onChange={(e) => setAvatarUrl(e.target.value)} />
        {save.error && (
          <p role="alert" className="text-xs text-[#EF4444]">
            {save.error}
          </p>
        )}
        {editable ? (
          <Button type="submit" variant="primary" disabled={save.pending}>
            <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
            {save.pending ? 'Saving...' : 'Save changes'}
          </Button>
        ) : (
          <p className="text-xs text-[#7D8590]">You need the workspace.edit permission to change these details.</p>
        )}
      </form>
    </Panel>
  );
}
