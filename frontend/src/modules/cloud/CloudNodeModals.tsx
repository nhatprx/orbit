import { useEffect, useState, type FormEvent } from 'react';
import { Folder } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../types/cloud.types';

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

  useEffect(() => {
    if (open) setName(initialValue);
  }, [open, initialValue]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      onClose();
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
            className="mt-1.5 h-9 w-full border border-[#3B434B] bg-[#0D1117] px-3 text-sm text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting || !name.trim()}>
            {submitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface MoveNodeModalProps {
  node: CloudNodeDto | null;
  api: CloudFilesApi;
  onClose: () => void;
  onMove: (nodeId: string, targetParentId: string | null) => Promise<void>;
}

export function MoveNodeModal({ node, api, onClose, onMove }: MoveNodeModalProps) {
  const [browseParentId, setBrowseParentId] = useState<string | null>(null);
  const [folders, setFolders] = useState<CloudNodeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!node) return;
    setBrowseParentId(null);
  }, [node]);

  useEffect(() => {
    if (!node) return;
    let active = true;
    setLoading(true);
    api
      .listNodes({ parentId: browseParentId, view: 'ALL', sortBy: 'name', sortDir: 'asc', limit: 100 })
      .then((res) => {
        if (!active) return;
        setFolders(res.items.filter((item) => item.nodeType === 'FOLDER' && item.id !== node.id));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [node, browseParentId, api]);

  if (!node) return null;

  async function handleConfirm() {
    if (!node) return;
    setSubmitting(true);
    try {
      await onMove(node.id, browseParentId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open title={`Move "${node.name}"`} subtitle="Choose a destination folder" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center justify-between border border-[#30363D] bg-[#0D1117] px-3 py-2 text-xs">
          <span className="font-mono text-[#8B949E]">
            Destination: <span className="text-[#22C55E]">{browseParentId ? 'Selected Folder' : 'Root'}</span>
          </span>
          {browseParentId && (
            <button
              type="button"
              onClick={() => setBrowseParentId(null)}
              className="font-mono text-[11px] text-[#8B949E] hover:text-[#22C55E]"
            >
              Back to Root
            </button>
          )}
        </div>

        <div className="max-h-60 divide-y divide-[#21262D] overflow-y-auto border border-[#30363D] bg-[#0D1117]">
          {loading ? (
            <p className="p-4 text-center font-mono text-xs text-[#7D8590]">Loading folders...</p>
          ) : folders.length === 0 ? (
            <p className="p-4 text-center text-xs text-[#7D8590]">No subfolders here.</p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setBrowseParentId(folder.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[#E6EDF3] hover:bg-[#161B22]"
              >
                <Folder className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
                <span className="truncate">{folder.name}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={submitting} onClick={() => void handleConfirm()}>
            {submitting ? 'Moving...' : 'Move Here'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
