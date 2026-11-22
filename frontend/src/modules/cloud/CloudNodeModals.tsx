import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { errorMessage } from '../../services/workspace/httpClient';
import type { CloudNodeDto } from '../../types/cloud.types';
import { splitFileName } from './cloudFormat';

interface FolderNameModalProps {
  open: boolean;
  title: string;
  submitLabel: string;
  initialValue?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

export function FolderNameModal({
  open,
  title,
  submitLabel,
  initialValue = '',
  onClose,
  onSubmit,
}: FolderNameModalProps) {
  const [name, setName] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialValue);
      setError(null);
    }
  }, [open, initialValue]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Failed to save name.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cloud-node-name" className="block font-mono text-[11px] uppercase text-[#8B949E]">
            Name
          </label>
          <input
            id="cloud-node-name"
            type="text"
            autoFocus
            required
            maxLength={255}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name..."
            className="mt-1.5 h-9 w-full rounded-none border border-[#3B434B] bg-[#0D1117] px-3 text-sm text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
          />
        </div>
        {error && (
          <div role="alert" className="flex items-center gap-2 border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting || !name.trim()}>
            {submitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface RenameNodeModalProps {
  node: CloudNodeDto | null;
  onClose: () => void;
  onSubmit: (newName: string) => Promise<void>;
}

/** Renames a file or folder while locking file extensions so users cannot corrupt formats. */
export function RenameNodeModal({ node, onClose, onSubmit }: RenameNodeModalProps) {
  const split = node ? splitFileName(node.name, node.nodeType) : { base: '', ext: '' };
  const [baseName, setBaseName] = useState(split.base);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!node) return;
    const next = splitFileName(node.name, node.nodeType);
    setBaseName(next.base);
    setError(null);
  }, [node]);

  if (!node) return null;

  const hasLockedExt = node.nodeType === 'FILE' && split.ext.length > 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = baseName.trim();
    if (!trimmed || submitting) return;
    if (trimmed.includes('/') || trimmed.includes('\\')) {
      setError('Name cannot contain path separators.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(hasLockedExt ? `${trimmed}${split.ext}` : trimmed);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Failed to rename item.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      title={node.nodeType === 'FOLDER' ? 'Rename Folder' : 'Rename File'}
      subtitle={hasLockedExt ? 'File extension is locked to preserve format compatibility' : undefined}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cloud-rename-input" className="block font-mono text-[11px] uppercase text-[#8B949E]">
            {hasLockedExt ? 'File Name' : 'Name'}
          </label>
          <div className="mt-1.5 flex items-stretch border border-[#3B434B] bg-[#0D1117] focus-within:border-[#22C55E]">
            <input
              id="cloud-rename-input"
              type="text"
              autoFocus
              required
              maxLength={255 - split.ext.length}
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="Enter name..."
              className="h-9 min-w-0 flex-1 rounded-none bg-transparent px-3 text-sm text-[#E6EDF3] placeholder-[#7D8590] focus:outline-none"
            />
            {hasLockedExt && (
              <span
                data-testid="locked-extension-badge"
                aria-label={`Locked extension ${split.ext}`}
                className="flex shrink-0 select-none items-center border-l border-[#30363D] bg-[#161B22] px-3 font-mono text-xs font-medium text-[#22C55E]"
              >
                {split.ext}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting || !baseName.trim()}>
            {submitting ? 'Renaming...' : 'Rename'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
