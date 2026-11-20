import { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Panel } from '../../components/ui/Panel';
import { memberService, projectService } from '../../services/workspace/services';
import type { AuthUser } from '../../types/auth.types';
import type { ProjectDto, WorkspaceDto } from '../../types/workspace.types';
import { can } from './permissionCatalog';

interface ProjectDangerTabProps {
  workspace: WorkspaceDto;
  project: ProjectDto;
  user: AuthUser;
  onDeleted: () => Promise<void>;
}

const DANGER_BTN =
  'border-[#EF4444] text-[#EF4444] hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-[#0D1117]';

export function ProjectDangerTab({ workspace, project, user, onDeleted }: ProjectDangerTabProps) {
  const [dialog, setDialog] = useState<'leave' | 'delete' | null>(null);
  const canDelete = can(project.myPermissions, 'project.delete');

  return (
    <div className="space-y-5">
      <Panel tone="danger" title="Leave project" description="You lose access to this project but stay in the workspace.">
        <Button type="button" variant="secondary" className={DANGER_BTN} onClick={() => setDialog('leave')}>
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Leave project
        </Button>
      </Panel>

      {canDelete && (
        <Panel tone="danger" title="Delete project" description="Removes this project from the workspace for everyone.">
          <Button type="button" variant="secondary" className={DANGER_BTN} onClick={() => setDialog('delete')}>
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            Delete project
          </Button>
        </Panel>
      )}

      <ConfirmDialog
        open={dialog === 'leave'}
        danger
        title="Leave project"
        message={`Leave ${project.name}? A project must always keep at least one owner.`}
        confirmLabel="Leave project"
        onConfirm={async () => {
          await memberService.removeProjectMember(workspace.id, project.id, user.id);
          await onDeleted();
        }}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        danger
        title="Delete project"
        message="The project and its modules become unavailable to every member."
        confirmLabel="Delete project"
        requireText={project.name}
        onConfirm={async () => {
          await projectService.deleteProject(workspace.id, project.id);
          await onDeleted();
        }}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
