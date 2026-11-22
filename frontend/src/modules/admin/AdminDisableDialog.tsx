import { useState, type FormEvent } from 'react';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { Button } from '../../components/ui/Button';
import { TextAreaField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { MAX_REASON_LENGTH } from './adminUserQuery';

interface AdminDisableDialogProps {
  open: boolean;
  username: string;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}

export function AdminDisableDialog({ open, username, onSubmit, onClose }: AdminDisableDialogProps) {
  const [reason, setReason] = useState('');
  const action = useAsyncAction(async () => {
    await onSubmit(reason);
    setReason('');
    onClose();
  });

  function close() {
    setReason('');
    action.clearError();
    onClose();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void action.run();
  }

  return (
    <Modal open={open} title="Disable account" subtitle={`@${username}`} onClose={close}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[15px] leading-relaxed text-[#BDBDBD]">
          The user is signed out everywhere right away and cannot sign in until the account is enabled again. Their
          data is kept.
        </p>
        <TextAreaField
          label="Reason (optional)"
          value={reason}
          rows={3}
          maxLength={MAX_REASON_LENGTH}
          hint={`${reason.length} / ${MAX_REASON_LENGTH}`}
          onChange={(event) => setReason(event.target.value)}
        />
        {action.error && (
          <p role="alert" className="text-xs text-[#EF4444]">
            {action.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={action.pending}>
            {action.pending ? 'Working...' : 'Disable account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
