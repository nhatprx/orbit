import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import type {
  CreateWhiteboardRequest,
  UpdateWhiteboardRequest,
  WhiteboardSummary,
} from '../../types/whiteboard.types';
import {
  WHITEBOARD_MAX_DESCRIPTION_LENGTH,
  WHITEBOARD_MAX_TITLE_LENGTH,
} from './whiteboardPermissions';

interface CreateWhiteboardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: CreateWhiteboardRequest) => Promise<void>;
}

export function CreateWhiteboardModal({ open, onClose, onSubmit }: CreateWhiteboardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const action = useAsyncAction(async (req: CreateWhiteboardRequest) => {
    await onSubmit(req);
    setTitle('');
    setDescription('');
  });

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setValidationError(null);
      action.clearError();
    }
  }, [open]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Board title is required.');
      return;
    }
    setValidationError(null);
    void action.run({ title: trimmedTitle, description: description.trim() || undefined });
  }

  return (
    <Modal open={open} title="New Whiteboard" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={WHITEBOARD_MAX_TITLE_LENGTH}
          placeholder="System architecture diagram"
          error={validationError}
          autoFocus
        />
        <TextAreaField
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={WHITEBOARD_MAX_DESCRIPTION_LENGTH}
          rows={3}
          placeholder="Brief context for this whiteboard..."
        />
        {action.error && (
          <p role="alert" className="text-xs text-[#EF4444]">
            {action.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={action.pending}>
            {action.pending ? 'Creating...' : 'Create Board'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface RenameWhiteboardModalProps {
  board: WhiteboardSummary | null;
  onClose: () => void;
  onSubmit: (boardId: string, request: UpdateWhiteboardRequest) => Promise<void>;
}

export function RenameWhiteboardModal({ board, onClose, onSubmit }: RenameWhiteboardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const action = useAsyncAction(async (boardId: string, req: UpdateWhiteboardRequest) => {
    await onSubmit(boardId, req);
  });

  useEffect(() => {
    if (board) {
      setTitle(board.title);
      setDescription(board.description);
      setValidationError(null);
      action.clearError();
    }
  }, [board]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!board) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Board title is required.');
      return;
    }
    setValidationError(null);
    void action.run(board.id, { title: trimmedTitle, description: description.trim() });
  }

  return (
    <Modal open={board !== null} title="Edit Whiteboard Details" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={WHITEBOARD_MAX_TITLE_LENGTH}
          error={validationError}
          autoFocus
        />
        <TextAreaField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={WHITEBOARD_MAX_DESCRIPTION_LENGTH}
          rows={3}
        />
        {action.error && (
          <p role="alert" className="text-xs text-[#EF4444]">
            {action.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={action.pending}>
            {action.pending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
