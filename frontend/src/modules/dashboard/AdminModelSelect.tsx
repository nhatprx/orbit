import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AiProviderType, OpenRouterModel } from '../../types/ai.types';

const DEFAULT_CHAT_MODELS: { id: string; label: string }[] = [
  { id: 'google/gemini-2.5-flash', label: 'Google: Gemini 2.5 Flash' },
  { id: 'google/gemini-2.5-pro', label: 'Google: Gemini 2.5 Pro' },
  { id: 'anthropic/claude-3.7-sonnet', label: 'Anthropic: Claude 3.7 Sonnet' },
  { id: 'anthropic/claude-3.5-haiku', label: 'Anthropic: Claude 3.5 Haiku' },
  { id: 'openai/gpt-4o-mini', label: 'OpenAI: GPT-4o Mini' },
  { id: 'openai/gpt-4o', label: 'OpenAI: GPT-4o' },
  { id: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek: V3' },
  { id: 'us.amazon.nova-micro-v1:0', label: 'Bedrock: Amazon Nova Micro' },
  { id: 'us.amazon.nova-pro-v1:0', label: 'Bedrock: Amazon Nova Pro' },
];

const DEFAULT_EMBED_MODELS: { id: string; label: string }[] = [
  { id: 'openai/text-embedding-3-small', label: 'OpenAI: text-embedding-3-small' },
  { id: 'openai/text-embedding-3-large', label: 'OpenAI: text-embedding-3-large' },
  { id: 'amazon.titan-embed-text-v2:0', label: 'Bedrock: Titan Embed Text v2' },
];

const INPUT_CLASS =
  'w-full border border-[#30363D] bg-[#0D1117] py-1.5 pl-2.5 pr-8 font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

interface AdminModelSelectProps {
  label: string;
  value: string;
  provider: AiProviderType;
  models: OpenRouterModel[];
  embed?: boolean;
  onChange: (value: string) => void;
}

export function AdminModelSelect({ label, value, provider, models, embed = false, onChange }: AdminModelSelectProps) {
  const [open, setOpen] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setFiltering(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const allOptions = useMemo(() => {
    const map = new Map<string, string>();
    const defaults = embed ? DEFAULT_EMBED_MODELS : DEFAULT_CHAT_MODELS;
    for (const d of defaults) map.set(d.id, d.label);
    if (!embed && provider === 'OPENROUTER') {
      for (const m of models) {
        map.set(m.id, `${m.name} ($${m.promptPricePerMillion}/$${m.completionPricePerMillion})`);
      }
    }
    return Array.from(map.entries()).map(([id, subtitle]) => ({ id, subtitle }));
  }, [embed, models, provider]);

  const visibleOptions = useMemo(() => {
    const q = filtering ? value.trim().toLowerCase() : '';
    if (!q) return allOptions;
    const filtered = allOptions.filter(
      (opt) => opt.id.toLowerCase().includes(q) || opt.subtitle.toLowerCase().includes(q)
    );
    return filtered.length > 0 ? filtered : allOptions;
  }, [allOptions, filtering, value]);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs text-[#8B949E]">{label}</label>
      <div className="relative">
        <input
          type="text"
          required
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          value={value}
          onFocus={() => {
            setOpen(true);
            setFiltering(false);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setFiltering(true);
          }}
          placeholder="Type or select model ID..."
          className={INPUT_CLASS}
        />
        <button
          type="button"
          aria-label={`Toggle ${label} options`}
          onClick={() => {
            setOpen((prev) => !prev);
            setFiltering(false);
          }}
          className="absolute right-0 top-0 flex h-full w-7 items-center justify-center border-l border-[#30363D] text-[#8B949E] hover:text-[#22C55E]"
        >
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {open && (
        <ul
          role="listbox"
          className="no-scrollbar absolute z-30 mt-1 max-h-56 w-full overflow-y-auto border border-[#30363D] bg-[#161B22] py-1 shadow-lg"
        >
          {visibleOptions.map((opt) => {
            const active = opt.id === value;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                    setFiltering(false);
                  }}
                  className={`flex w-full flex-col px-2.5 py-1.5 text-left transition-colors ${
                    active ? 'bg-[#052E16] text-[#22C55E]' : 'text-[#E6EDF3] hover:bg-[#21262D]'
                  }`}
                >
                  <span className="truncate font-mono text-xs">{opt.id}</span>
                  <span className="truncate text-[10px] text-[#8B949E]">{opt.subtitle}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
