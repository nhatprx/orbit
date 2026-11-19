import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FolderPlus, Plus, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cloudFilesService } from '../../services/cloud.service';
import type { AuthUser } from '../../types/auth.types';
import type {
  CloudCategory,
  CloudFileItem,
  CloudFileKind,
} from '../../types/cloud.types';
import { CloudFileTable } from './CloudFileTable';
import { CloudPreviewPane } from './CloudPreviewPane';
import { CloudSidebar } from './CloudSidebar';

interface CloudFilesPageProps {
  user: AuthUser;
}

export function CloudFilesPage({ user }: CloudFilesPageProps) {
  const [category, setCategory] = useState<CloudCategory>('all');
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<CloudFileItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<CloudFileKind>('doc');

  const refresh = useCallback(async () => {
    const items = await cloudFilesService.listFiles(category, query, 50);
    setFiles(items);
    setSelectedId((prev) =>
      items.some((f) => f.id === prev) ? prev : (items[0]?.id ?? null)
    );
  }, [category, query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedFile = files.find((f) => f.id === selectedId) ?? null;

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    const created = await cloudFilesService.createItem(
      { name: newName, kind: newKind },
      user.username ?? user.name
    );
    setNewName('');
    setCreating(false);
    setSelectedId(created.id);
    await refresh();
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full overflow-hidden border border-[#30363D] bg-[#0D1117]">
      <CloudSidebar active={category} onSelect={setCategory} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-4 py-3">
          <div className="flex items-center border border-[#3B434B] bg-[#0D1117] px-2.5 focus-within:border-[#22C55E]">
            <Search className="h-4 w-4 text-[#8A8A8A]" strokeWidth={1.5} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Cloud Files..."
              className="h-8 w-56 bg-transparent px-2 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setNewKind('folder');
                setCreating(true);
              }}
            >
              <FolderPlus className="h-4 w-4" strokeWidth={1.5} />
              New Folder
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setNewKind('doc');
                setCreating(true);
              }}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              New File
            </Button>
          </div>
        </div>

        {creating && (
          <form
            onSubmit={handleCreate}
            className="flex flex-wrap items-center gap-2 border-b border-[#30363D] bg-[#21262D] px-4 py-3"
          >
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as CloudFileKind)}
              className="h-9 border border-[#3B434B] bg-[#0D1117] px-2.5 text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
            >
              <option value="folder">Folder</option>
              <option value="doc">Document</option>
              <option value="sheet">Spreadsheet</option>
              <option value="slide">Presentation</option>
              <option value="markdown">Markdown</option>
            </select>
            <input
              type="text"
              autoFocus
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter file or folder name..."
              className="h-9 flex-1 border border-[#3B434B] bg-[#0D1117] px-3 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
            />
            <Button type="submit" variant="primary">
              Create
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </form>
        )}

        <CloudFileTable
          files={files}
          selectedId={selectedId}
          onSelect={(f) => setSelectedId(f.id)}
          onToggleStar={(id) => void cloudFilesService.toggleStar(id).then(refresh)}
          onToggleTrash={(id, trashed) =>
            void cloudFilesService.setTrashed(id, trashed).then(refresh)
          }
        />
      </div>

      <CloudPreviewPane
        file={selectedFile}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
