import { Bot, RefreshCw, Save } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { AiProviderType } from '../../types/ai.types';
import { AdminApiKeyVault } from './AdminApiKeyVault';
import { AdminModelSelect } from './AdminModelSelect';
import { AdminOpenRouterBillingSection } from './AdminOpenRouterBillingSection';
import { useAdminAiConfig } from './useAdminAiConfig';

const INPUT =
  'w-full border border-[#30363D] bg-[#0D1117] px-2.5 py-1.5 font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

interface AdminAiConfigPanelProps {
  section?: 'keys' | 'users' | 'all';
}

export function AdminAiConfigPanel({ section = 'all' }: AdminAiConfigPanelProps) {
  const vm = useAdminAiConfig();
  const showKeys = section === 'all' || section === 'keys';
  const showUsers = section === 'all' || section === 'users';

  return (
    <section className="flex h-full min-h-0 flex-col border border-[#30363D] bg-[#161B22]">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#30363D] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E6EDF3]">
            {section === 'users' ? 'AI User Usage & Budgets' : 'AI Provider, Keys & Models'}
          </h3>
          <p className="mt-0.5 text-xs text-[#8A8A8A]">
            {section === 'users'
              ? 'Monitor per-user AI spend, models used, and monthly USD limits.'
              : 'Manage multiple API keys and select model tiers from dropdowns.'}
          </p>
        </div>
        <Bot className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
      </div>

      {showKeys && (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {vm.config && (
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone={vm.config.bedrockConfigured ? 'green' : 'neutral'} withDot>
                AWS Bedrock {vm.config.bedrockConfigured ? 'Ready' : 'No Creds'}
              </Badge>
              <Badge tone={vm.config.openRouterConfigured ? 'green' : 'neutral'} withDot>
                OpenRouter {vm.config.openRouterConfigured ? 'Ready' : 'No Key'}
              </Badge>
              <Badge tone={vm.config.openRouterMgmtConfigured ? 'green' : 'neutral'} withDot>
                Mgmt Key {vm.config.openRouterMgmtConfigured ? vm.config.openRouterMgmtKeyPreview ?? 'Ready' : 'Not Set'}
              </Badge>
              <Badge tone={vm.config.qdrantConfigured ? 'green' : 'neutral'} withDot>
                Qdrant Cloud {vm.config.qdrantConfigured ? 'Connected' : 'Fallback PG'}
              </Badge>
            </div>
          )}

          <form onSubmit={vm.handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-[#8B949E]">Active Cloud Provider</label>
                <select value={vm.provider} onChange={(e) => vm.setProvider(e.target.value as AiProviderType)} className={INPUT}>
                  <option value="BEDROCK">AWS Bedrock (Primary)</option>
                  <option value="OPENROUTER">OpenRouter (Multi-Model)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8B949E]">Default Monthly User Budget (USD)</label>
                <input type="number" step="0.5" min="0" value={vm.defaultBudget} onChange={(e) => vm.setDefaultBudget(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8B949E]">
                  OpenRouter API Key {vm.config?.openRouterApiKeyPreview ? `(${vm.config.openRouterApiKeyPreview})` : ''}
                </label>
                <input type="password" value={vm.openRouterApiKey} onChange={(e) => vm.setOpenRouterApiKey(e.target.value)} placeholder="Leave blank to keep existing" className={INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8B949E]">
                  OpenRouter Management Key {vm.config?.openRouterMgmtKeyPreview ? `(${vm.config.openRouterMgmtKeyPreview})` : ''}
                </label>
                <input type="password" value={vm.openRouterMgmtKey} onChange={(e) => vm.setOpenRouterMgmtKey(e.target.value)} placeholder="Optional: for credits & sub-keys" className={INPUT} />
              </div>

              <AdminModelSelect label="orbit-fast Model ID" value={vm.fastModel} provider={vm.provider} models={vm.models} onChange={vm.setFastModel} />
              <AdminModelSelect label="orbit-pro Model ID" value={vm.proModel} provider={vm.provider} models={vm.models} onChange={vm.setProModel} />
              <AdminModelSelect label="orbit-coder Model ID" value={vm.coderModel} provider={vm.provider} models={vm.models} onChange={vm.setCoderModel} />
              <AdminModelSelect label={`Embedding Model (${vm.region})`} value={vm.embedModel} provider={vm.provider} models={vm.models} embed onChange={vm.setEmbedModel} />
            </div>

            <AdminApiKeyVault
              onUseKey={(kind, val) => {
                if (kind === 'openrouter') vm.setOpenRouterApiKey(val);
                else vm.setOpenRouterMgmtKey(val);
              }}
            />

            <label className="flex items-center gap-2 text-xs text-[#E6EDF3]">
              <input type="checkbox" checked={vm.webSearch} onChange={(e) => vm.setWebSearch(e.target.checked)} className="accent-[#22C55E]" />
              Allow external web search in Orbit AI
            </label>

            {vm.notice && <p role="status" className="border border-[#22C55E] bg-[#052E16] px-3 py-2 text-xs text-[#22C55E]">{vm.notice}</p>}
            {vm.error && <p role="alert" className="border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">{vm.error}</p>}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={vm.saving}>
                <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
                {vm.saving ? 'Saving...' : 'Save AI Configuration'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => void vm.handleSyncModels()}>
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                Sync OpenRouter Models
              </Button>
            </div>
          </form>
        </div>
      )}

      {showUsers && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          <AdminOpenRouterBillingSection
            credits={vm.credits}
            usagePage={vm.usagePage}
            search={vm.usageQuery.search}
            mgmtConfigured={Boolean(vm.config?.openRouterMgmtConfigured)}
            onSearchChange={(search) => vm.updateUsageQuery({ page: 0, search })}
            onPageChange={(page) => vm.updateUsageQuery({ page })}
            onSizeChange={(size) => vm.updateUsageQuery({ page: 0, size })}
            onRefresh={() => vm.loadBilling(Boolean(vm.config?.openRouterMgmtConfigured), vm.usageQuery)}
            onUpdateBudget={vm.updateUserBudget}
          />
        </div>
      )}
    </section>
  );
}
