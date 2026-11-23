import { useState } from 'react';
import { Check, KeyRound, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export type SavedKeyKind = 'openrouter' | 'mgmt';

export interface SavedAdminApiKey {
  id: string;
  label: string;
  kind: SavedKeyKind;
  value: string;
  preview: string;
}

const STORAGE_KEY = 'orbit:admin-ai-api-keys';

function maskKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= 10) return '••••••';
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function loadSavedKeys(): SavedAdminApiKey[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface AdminApiKeyVaultProps {
  onUseKey: (kind: SavedKeyKind, value: string) => void;
}

export function AdminApiKeyVault({ onUseKey }: AdminApiKeyVaultProps) {
  const [keys, setKeys] = useState<SavedAdminApiKey[]>(() => loadSavedKeys());
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<SavedKeyKind>('openrouter');
  const [value, setValue] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  function persist(next: SavedAdminApiKey[]) {
    setKeys(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore storage quota errors */
    }
  }

  function handleAdd() {
    const trimmedVal = value.trim();
    const trimmedLabel = label.trim() || `${kind === 'openrouter' ? 'OpenRouter' : 'Management'} Key ${keys.length + 1}`;
    if (!trimmedVal) return;
    const entry: SavedAdminApiKey = {
      id: `key-${Date.now()}`,
      label: trimmedLabel,
      kind,
      value: trimmedVal,
      preview: maskKey(trimmedVal),
    };
    persist([entry, ...keys]);
    setLabel('');
    setValue('');
  }

  function handleUse(entry: SavedAdminApiKey) {
    setActiveId(entry.id);
    onUseKey(entry.kind, entry.value);
  }

  function handleDelete(id: string) {
    persist(keys.filter((k) => k.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return (
    <div className="space-y-2.5 border border-[#30363D] bg-[#0D1117] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
          <KeyRound className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <span>Saved API Key Vault ({keys.length})</span>
        </div>
        <span className="font-mono text-[10px] text-[#7D8590]">Store multiple keys &amp; switch quickly</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_140px_1fr_auto]">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Key label (e.g. Prod)"
          className="border border-[#30363D] bg-[#161B22] px-2.5 py-1.5 font-mono text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
        />
        <select
          aria-label="Key type"
          value={kind}
          onChange={(e) => setKind(e.target.value as SavedKeyKind)}
          className="border border-[#30363D] bg-[#161B22] px-2 py-1.5 font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
        >
          <option value="openrouter">OpenRouter API</option>
          <option value="mgmt">Management Key</option>
        </select>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste API key (sk-or-v1-...)"
          className="border border-[#30363D] bg-[#161B22] px-2.5 py-1.5 font-mono text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
        />
        <Button type="button" variant="secondary" disabled={!value.trim()} onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Add Key
        </Button>
      </div>

      {keys.length > 0 && (
        <div className="divide-y divide-[#30363D] border border-[#30363D] bg-[#161B22]">
          {keys.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <Badge tone={entry.kind === 'openrouter' ? 'green' : 'neutral'}>
                  {entry.kind === 'openrouter' ? 'API' : 'MGMT'}
                </Badge>
                <span className="truncate font-medium text-[#E6EDF3]">{entry.label}</span>
                <span className="font-mono text-[11px] text-[#7D8590]">{entry.preview}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button type="button" variant="secondary" onClick={() => handleUse(entry)} className="px-2 py-1 text-[11px]">
                  <Check className="h-3 w-3" strokeWidth={1.5} />
                  {activeId === entry.id ? 'Loaded' : 'Use Key'}
                </Button>
                <button
                  type="button"
                  aria-label={`Remove ${entry.label}`}
                  onClick={() => handleDelete(entry.id)}
                  className="p-1 text-[#7D8590] hover:text-[#EF4444]"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
