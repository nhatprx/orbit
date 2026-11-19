import {
  Archive,
  FileEdit,
  Inbox,
  PenSquare,
  Send,
  Star,
  Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { MailFolder } from '../../types/mail.types';

interface MailFolderNavProps {
  activeFolder: MailFolder;
  counts: Record<MailFolder, number>;
  onSelectFolder: (folder: MailFolder) => void;
  onOpenCompose: () => void;
}

const FOLDERS: { id: MailFolder; label: string; icon: typeof Inbox }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileEdit },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export function MailFolderNav({
  activeFolder,
  counts,
  onSelectFolder,
  onOpenCompose,
}: MailFolderNavProps) {
  return (
    <div className="flex w-52 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22] p-3">
      <Button
        type="button"
        variant="primary"
        onClick={onOpenCompose}
        className="mb-4 w-full"
      >
        <PenSquare className="h-4 w-4" strokeWidth={1.5} />
        Compose
      </Button>

      <nav className="space-y-1">
        {FOLDERS.map((folder) => {
          const Icon = folder.icon;
          const selected = activeFolder === folder.id;
          const count = counts[folder.id] ?? 0;

          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className={`flex w-full items-center justify-between border px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                  : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{folder.label}</span>
              </span>
              {count > 0 && (
                <span className="font-mono text-xs">{count}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
