import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SquareCheckbox } from '../../components/ui/SquareCheckbox';
import { errorMessage } from '../../services/workspace/httpClient';
import type { SprintDto } from '../../types/issues.types';

export interface CompleteSprintDialogProps {
  sprint: SprintDto | null;
  onClose: () => void;
  onConfirm: (sprintId: string, moveIncompleteToBacklog: boolean) => Promise<void>;
}

export function CompleteSprintDialog({ sprint, onClose, onConfirm }: CompleteSprintDialogProps) {
  const [moveIncomplete, setMoveIncomplete] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sprint) return;
    setMoveIncomplete(true);
    setError(null);
  }, [sprint]);

  const incompleteCount = sprint ? Math.max(0, sprint.totalIssues - sprint.completedIssues) : 0;

  async function handleConfirm() {
    if (!sprint || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(sprint.id, moveIncomplete);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={sprint !== null}
      title="Complete Sprint"
      subtitle={sprint ? `Finalize ${sprint.name}` : undefined}
      size="md"
      onClose={onClose}
    >
      {sprint && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 border border-[#30363D] bg-[#0D1117] p-3 font-mono text-xs">
            <div>
              <span className="block text-[10px] uppercase text-[#8B949E]">Completed Issues</span>
              <span className="mt-0.5 block text-sm font-semibold text-[#22C55E]">{sprint.completedIssues}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-[#8B949E]">Incomplete Issues</span>
              <span className="mt-0.5 block text-sm font-semibold text-[#EAB308]">{incompleteCount}</span>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-[#BDBDBD]">
            Completed sprints cannot be reopened. Choose how to handle unfinished items below.
          </p>

          <div className="flex items-start gap-2.5 border border-[#30363D] bg-[#0D1117] p-3">
            <SquareCheckbox
              checked={moveIncomplete}
              label="Move incomplete issues to Backlog"
              onChange={setMoveIncomplete}
              disabled={submitting}
            />
            <div className="min-w-0 text-xs">
              <p className="font-medium text-[#E6EDF3]">Move incomplete issues to Backlog</p>
              <p className="mt-0.5 text-[#8B949E]">
                Unfinished issues are returned to Backlog for future sprint planning. Uncheck to keep them linked to this sprint.
              </p>
            </div>
          </div>

          {error && <p role="alert" className="text-xs text-[#EF4444]">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-[#30363D] pt-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={submitting} onClick={() => void handleConfirm()}>
              {submitting ? 'Completing...' : 'Complete Sprint'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
