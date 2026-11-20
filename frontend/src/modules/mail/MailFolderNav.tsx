import { Archive, Inbox, PenSquare, Send, Trash2, type LucideIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export type MailFolder = 'inbox' | 'sent' | 'archive' | 'trash';

const FOLDERS: { id: MailFolder; label: string; icon: LucideIcon }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

interface MailFolderNavProps {
  activeFolder: MailFolder;
  unreadInbox: number;
  onSelectFolder: (folder: MailFolder) => void;
  onCompose: () => void;
}

export function MailFolderNav({ activeFolder, unreadInbox, onSelectFolder, onCompose }: MailFolderNavProps) {
  return (
    <div className="flex w-48 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22] p-3">
      <Button type="button" variant="primary" onClick={onCompose} className="mb-4 w-full">
        <PenSquare className="h-4 w-4" strokeWidth={1.5} />
        Compose
      </Button>
      <nav className="space-y-1" aria-label="Mail folders">
        {FOLDERS.map((folder) => {
          const Icon = folder.icon;
          const selected = activeFolder === folder.id;
          return (
            <button
              key={folder.id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              onClick={() => onSelectFolder(folder.id)}
              className={`flex w-full items-center justify-between border px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                  : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                {folder.label}
              </span>
              {folder.id === 'inbox' && unreadInbox > 0 && <span className="font-mono text-xs">{unreadInbox}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
