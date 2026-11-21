import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { errorMessage } from '../../services/workspace/httpClient';
import type { SprintDto, UpdateSprintRequest } from '../../types/issues.types';

export interface EditSprintModalProps {
  sprint: SprintDto | null;
  onClose: () => void;
  onSubmit: (sprintId: string, req: UpdateSprintRequest) => Promise<void>;
}

export function EditSprintModal({ sprint, onClose, onSubmit }: EditSprintModalProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sprint) return;
    setName(sprint.name);
    setGoal(sprint.goal ?? '');
    setStartDate(sprint.startDate ?? '');
    setEndDate(sprint.endDate ?? '');
    setError(null);
  }, [sprint]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sprint) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Sprint name is required.');
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setError('End date must be on or after start date.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(sprint.id, {
        name: trimmedName,
        goal: goal.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        clearStartDate: !startDate,
        clearEndDate: !endDate,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={sprint !== null} title="Edit Sprint" subtitle="Update sprint name, goal, and schedule" size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <TextField
          label="Sprint Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
        />

        <TextAreaField
          label="Sprint Goal"
          rows={3}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Primary deliverable and success criteria for this sprint"
          maxLength={500}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <TextField label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        {error && <p role="alert" className="text-xs text-[#EF4444]">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-[#30363D] pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Sprint'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
