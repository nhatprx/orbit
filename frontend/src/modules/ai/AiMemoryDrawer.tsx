import { useState, type FormEvent } from 'react';
import { Brain, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { AiMemory, AiScopeType } from '../../types/ai.types';

interface AiMemoryDrawerProps {
  scopeType: AiScopeType;
  memories: AiMemory[];
  onAdd: (category: 'FACT' | 'DECISION' | 'PREFERENCE', content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export function AiMemoryDrawer({
  scopeType,
  memories,
  onAdd,
  onDelete,
  onClose,
}: AiMemoryDrawerProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'FACT' | 'DECISION' | 'PREFERENCE'>('FACT');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(category, content.trim());
      setContent('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-[#30363D] bg-[#161B22]">
      <div className="flex items-center justify-between border-b border-[#30363D] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
            AI Memory ({scopeType})
          </span>
        </div>
        <button type="button" aria-label="Close memory panel" onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3]">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 border-b border-[#30363D] p-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as 'FACT' | 'DECISION' | 'PREFERENCE')}
          className="h-7 w-full border border-[#30363D] bg-[#0D1117] px-2 font-mono text-[11px] text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
        >
          <option value="FACT">FACT</option>
          <option value="DECISION">DECISION</option>
          <option value="PREFERENCE">PREFERENCE</option>
        </select>
        <textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a persistent fact, decision, or preference..."
          className="w-full border border-[#30363D] bg-[#0D1117] p-2 text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
        />
        <Button type="submit" variant="secondary" disabled={saving || !content.trim()} className="w-full">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          {saving ? 'Saving...' : 'Save memory'}
        </Button>
      </form>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {memories.length === 0 ? (
          <p className="text-xs text-[#7D8590]">
            No saved memories in this scope yet. You can also type &quot;Remember ...&quot; in chat.
          </p>
        ) : (
          memories.map((mem) => (
            <div key={mem.id} className="border border-[#30363D] bg-[#0D1117] p-2.5">
              <div className="mb-1 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <Badge tone="neutral">{mem.category}</Badge>
                  {mem.vectorIndexed && <Badge tone="green">QDRANT</Badge>}
                </div>
                <button
                  type="button"
                  aria-label="Delete memory"
                  onClick={() => void onDelete(mem.id)}
                  className="text-[#7D8590] hover:text-[#EF4444]"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-xs leading-relaxed text-[#E6EDF3]">{mem.content}</p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
