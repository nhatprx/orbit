import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { projectService } from '../../services/workspace/services';
import type { ProjectDto, WorkspaceDto } from '../../types/workspace.types';
import { can } from './permissionCatalog';

interface ProjectGeneralTabProps {
  workspace: WorkspaceDto;
  project: ProjectDto;
  onChanged: () => Promise<void>;
}

export function ProjectGeneralTab({ workspace, project, onChanged }: ProjectGeneralTabProps) {
  const editable = can(project.myPermissions, 'project.edit');
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useAsyncAction(async () => {
    await projectService.updateProject(workspace.id, project.id, {
      name: name.trim(),
      description: description.trim(),
    });
    await onChanged();
    setSaved(true);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    if (!name.trim()) return setNameError('Project name is required.');
    setNameError(null);
    await save.run();
  }

  return (
    <Panel title="Project details" description="Name and description shown to project members.">
      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-xl space-y-4">
        <TextField label="Name" required maxLength={100} value={name} disabled={!editable} error={nameError} onChange={(e) => setName(e.target.value)} />
        <TextAreaField label="Description" rows={3} maxLength={500} value={description} disabled={!editable} onChange={(e) => setDescription(e.target.value)} />
        {save.error && (
          <p role="alert" className="text-xs text-[#EF4444]">
            {save.error}
          </p>
        )}
        {saved && !save.error && (
          <p role="status" className="text-xs text-[#22C55E]">
            Changes saved.
          </p>
        )}
        {editable ? (
          <Button type="submit" variant="primary" disabled={save.pending}>
            <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
            {save.pending ? 'Saving...' : 'Save changes'}
          </Button>
        ) : (
          <p className="text-xs text-[#7D8590]">You need the project.edit permission to change these details.</p>
        )}
      </form>
    </Panel>
  );
}
