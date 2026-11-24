import { useMemo, useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound } from 'lucide-react';

interface GitEnvPreviewProps {
  content: string;
}

export interface EnvPreviewRow {
  kind: 'entry' | 'comment';
  key?: string;
  value?: string;
  comment?: string;
  sensitive?: boolean;
  line: number;
}

const SENSITIVE_KEY_RE = /(SECRET|TOKEN|PASSWORD|PASS|KEY|AUTH|PRIVATE|CREDENTIAL|JWT|DSN|API_KEY|ACCESS)/i;

export function parseEnvContent(content: string): EnvPreviewRow[] {
  const rows: EnvPreviewRow[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('#')) {
      rows.push({ kind: 'comment', comment: trimmed.replace(/^#+\s*/, ''), line: idx + 1 });
      return;
    }
    const clean = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const eq = clean.indexOf('=');
    if (eq <= 0) {
      rows.push({ kind: 'comment', comment: trimmed, line: idx + 1 });
      return;
    }
    const key = clean.slice(0, eq).trim();
    let value = clean.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    rows.push({ kind: 'entry', key, value, sensitive: SENSITIVE_KEY_RE.test(key), line: idx + 1 });
  });
  return rows;
}

export function GitEnvPreview({ content }: GitEnvPreviewProps) {
  const rows = useMemo(() => parseEnvContent(content), [content]);
  const [revealAll, setRevealAll] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const entryCount = rows.filter((r) => r.kind === 'entry').length;

  function toggleKey(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function copyValue(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  return (
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#0D1117]">
      <div className="flex items-center justify-between border-b border-[#30363D] bg-[#161B22] px-4 py-2 font-mono text-xs">
        <span className="inline-flex items-center gap-1.5 text-[#BDBDBD]">
          <KeyRound className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          {entryCount} environment variables
        </span>
        <button
          type="button"
          onClick={() => setRevealAll((v) => !v)}
          className="inline-flex items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2.5 py-1 text-[11px] text-[#E6EDF3] hover:border-[#22C55E]"
        >
          {revealAll ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />}
          {revealAll ? 'Mask secrets' : 'Reveal all'}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-xs text-[#8A8A8A]">Empty environment file.</div>
      ) : (
        <div className="divide-y divide-[#21262D]">
          {rows.map((row) =>
            row.kind === 'comment' ? (
              <div key={`c-${row.line}`} className="bg-[#161B22]/60 px-4 py-1.5 font-mono text-[11px] text-[#6272A4]">
                # {row.comment}
              </div>
            ) : (
              <div key={`e-${row.line}-${row.key}`} className="flex items-center gap-3 px-4 py-2 font-mono text-xs hover:bg-[#161B22]">
                <span className="w-56 shrink-0 truncate font-semibold text-[#50FA7B]" title={row.key}>
                  {row.key}
                </span>
                <span className="min-w-0 flex-1 truncate text-[#F1FA8C]">
                  {row.sensitive && !revealAll && !revealed.has(row.key!)
                    ? '••••••••••••'
                    : row.value || <span className="text-[#6E7681]">(empty)</span>}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {row.sensitive && (
                    <button
                      type="button"
                      aria-label={`Toggle ${row.key}`}
                      onClick={() => toggleKey(row.key!)}
                      className="border border-[#30363D] bg-[#0D1117] p-1 text-[#8A8A8A] hover:border-[#22C55E] hover:text-[#E6EDF3]"
                    >
                      {revealAll || revealed.has(row.key!) ? <EyeOff className="h-3 w-3" strokeWidth={1.5} /> : <Eye className="h-3 w-3" strokeWidth={1.5} />}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Copy ${row.key}`}
                    onClick={() => void copyValue(row.key!, row.value ?? '')}
                    className="border border-[#30363D] bg-[#0D1117] p-1 text-[#8A8A8A] hover:border-[#22C55E] hover:text-[#E6EDF3]"
                  >
                    {copiedKey === row.key ? <Check className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} /> : <Copy className="h-3 w-3" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
