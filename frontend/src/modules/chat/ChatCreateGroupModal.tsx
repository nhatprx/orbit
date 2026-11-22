import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';

interface ChatCreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function ChatCreateGroupModal({ open, onClose, onCreate }: ChatCreateGroupModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setError(null);
  }, [open]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Channel name is required.');
    if (trimmed.length > 64) return setError('Channel name must be 64 characters or fewer.');
    onCreate(trimmed);
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Create Channel"
      subtitle="Create an empty channel group. Add sub-channels from its Settings menu."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Channel Name"
          value={name}
          maxLength={64}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. ENGINEERING"
          autoFocus
        />
        {error && <p role="alert" className="text-xs text-[#EF4444]">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-[#30363D] pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>Create Channel</Button>
        </div>
      </form>
    </Modal>
  );
}
