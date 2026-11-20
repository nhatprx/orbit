import { useState } from 'react';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { Button } from './Button';
import { TextField } from './Field';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  /** When set, the user must type this exact text before confirming (BR-08). */
  requireText?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const DANGER_CLASS =
  'border-[#EF4444] bg-[#EF4444] text-[#0D1117] hover:border-[#EF4444] hover:bg-[#0D1117] hover:text-[#EF4444]';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger = false,
  requireText,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const action = useAsyncAction(async () => {
    await onConfirm();
    setTyped('');
    onClose();
  });
  const blocked = requireText !== undefined && typed !== requireText;

  function close() {
    setTyped('');
    action.clearError();
    onClose();
  }

  return (
    <Modal open={open} title={title} onClose={close}>
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-[#BDBDBD]">{message}</p>
        {requireText !== undefined && (
          <TextField
            label={`Type "${requireText}" to confirm`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
          />
        )}
        {action.error && (
          <p role="alert" className="text-xs text-[#EF4444]">
            {action.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={danger ? 'secondary' : 'primary'}
            className={danger ? DANGER_CLASS : ''}
            disabled={blocked || action.pending}
            onClick={() => void action.run()}
          >
            {action.pending ? 'Working...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
