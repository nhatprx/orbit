import { Bot, Brain, DollarSign, Tag } from 'lucide-react';
import type { AiModelId, AiScopeType, AiUsageSummary } from '../../types/ai.types';

interface AiThreadHeaderProps {
  title: string;
  scopeLabel: string;
  scopeType: AiScopeType;
  model: AiModelId;
  workspaceId?: string | null;
  projectId?: string | null;
  usage: AiUsageSummary | null;
  memoryCount: number;
  showUsage: boolean;
  showMemory: boolean;
  onChangeScope: (scope: AiScopeType) => void;
  onChangeModel: (model: AiModelId) => void;
  onToggleUsage: () => void;
  onToggleMemory: () => void;
}

export function AiThreadHeader({
  title,
  scopeLabel,
  scopeType,
  model,
  workspaceId,
  projectId,
  usage,
  memoryCount,
  showUsage,
  showMemory,
  onChangeScope,
  onChangeModel,
  onToggleUsage,
  onToggleMemory,
}: AiThreadHeaderProps) {
  const costText = `$${(usage?.currentMonthCostUsd ?? 0).toFixed(2)}`;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight text-[#E6EDF3]">
          <Bot className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
          <span className="truncate">{title}</span>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] leading-tight text-[#8B949E]">
          <span className="inline-flex shrink-0 items-center gap-1">
            <Tag className="h-3 w-3" strokeWidth={1.5} />
            <span>{scopeLabel}</span>
          </span>
          <span className="h-2.5 w-px shrink-0 bg-[#30363D]" aria-hidden="true" />
          <span className="truncate font-mono text-[11px] text-[#4ADE80]">{model}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <select
          aria-label="AI context scope"
          value={scopeType}
          onChange={(e) => onChangeScope(e.target.value as AiScopeType)}
          className="h-7 border border-[#30363D] bg-[#0D1117] px-2 font-mono text-[11px] text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
        >
          <option value="USER">Personal</option>
          {workspaceId && <option value="WORKSPACE">Workspace</option>}
          {projectId && <option value="PROJECT">Project</option>}
        </select>

        <select
          aria-label="AI model tier"
          value={model}
          onChange={(e) => onChangeModel(e.target.value as AiModelId)}
          className="h-7 border border-[#30363D] bg-[#0D1117] px-2 font-mono text-[11px] text-[#22C55E] focus:border-[#22C55E] focus:outline-none"
        >
          <option value="orbit-pro">orbit-pro</option>
          <option value="orbit-coder">orbit-coder</option>
          <option value="orbit-fast">orbit-fast</option>
        </select>

        <button
          type="button"
          aria-label={costText}
          onClick={onToggleUsage}
          className={`inline-flex h-7 items-center gap-1 border px-2 font-mono text-[11px] transition-colors ${
            showUsage
              ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
              : 'border-[#30363D] bg-[#0D1117] text-[#22C55E] hover:border-[#22C55E]'
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" strokeWidth={1.5} />
          {(usage?.currentMonthCostUsd ?? 0).toFixed(2)}
        </button>

        <button
          type="button"
          onClick={onToggleMemory}
          className={`inline-flex h-7 items-center gap-1.5 border px-2.5 font-mono text-[11px] transition-colors ${
            showMemory
              ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
              : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <Brain className="h-3.5 w-3.5" strokeWidth={1.5} />
          Memory ({memoryCount})
        </button>
      </div>
    </header>
  );
}
