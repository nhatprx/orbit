import { useEffect, useState, type FormEvent } from 'react';
import { aiChatService } from '../../services/ai.service';
import { aiOpenRouterService } from '../../services/aiOpenRouter.service';
import type {
  AdminUserAiUsagePage,
  AiProviderConfig,
  AiProviderType,
  OpenRouterCredits,
  OpenRouterModel,
} from '../../types/ai.types';

export function useAdminAiConfig() {
  const [config, setConfig] = useState<AiProviderConfig | null>(null);
  const [provider, setProvider] = useState<AiProviderType>('BEDROCK');
  const [region, setRegion] = useState('us-east-1');
  const [fastModel, setFastModel] = useState('');
  const [proModel, setProModel] = useState('');
  const [coderModel, setCoderModel] = useState('');
  const [embedModel, setEmbedModel] = useState('');
  const [webSearch, setWebSearch] = useState(true);
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [openRouterMgmtKey, setOpenRouterMgmtKey] = useState('');
  const [defaultBudget, setDefaultBudget] = useState('10');
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [credits, setCredits] = useState<OpenRouterCredits | null>(null);
  const [usagePage, setUsagePage] = useState<AdminUserAiUsagePage | null>(null);
  const [usageQuery, setUsageQuery] = useState({ page: 0, size: 10, search: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadBilling(mgmtReady: boolean, query = usageQuery) {
    const [pageData, creditData] = await Promise.all([
      aiOpenRouterService.listAdminUserUsage(query).catch(() => null),
      mgmtReady ? aiOpenRouterService.getAdminCredits().catch(() => null) : Promise.resolve(null),
    ]);
    setUsagePage(pageData);
    setCredits(creditData);
  }

  useEffect(() => {
    void aiChatService.getAdminConfig().then((cfg) => {
      setConfig(cfg);
      setProvider(cfg.activeProvider);
      setRegion(cfg.bedrockRegion);
      setFastModel(cfg.fastModel);
      setProModel(cfg.proModel);
      setCoderModel(cfg.coderModel);
      setEmbedModel(cfg.embedModel);
      setWebSearch(cfg.webSearchEnabled);
      setDefaultBudget(String(cfg.defaultMonthlyBudgetUsd ?? 10));
      void loadBilling(Boolean(cfg.openRouterMgmtConfigured));
      if (cfg.openRouterConfigured || cfg.activeProvider === 'OPENROUTER') {
        void aiOpenRouterService.listModels().then((list) => {
          if (list.length > 0) setModels(list);
        }).catch(() => undefined);
      }
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Unable to load AI configuration.');
    });
  }, []);

  async function handleSyncModels() {
    setError(null);
    try {
      const list = await aiOpenRouterService.listModels();
      setModels(list);
      setNotice(`Synced ${list.length} OpenRouter models.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync OpenRouter models.');
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const updated = await aiChatService.updateAdminConfig({
        activeProvider: provider,
        bedrockRegion: region,
        fastModel,
        proModel,
        coderModel,
        embedModel,
        webSearchEnabled: webSearch,
        openRouterApiKey: openRouterApiKey.trim() || undefined,
        openRouterMgmtKey: openRouterMgmtKey.trim() || undefined,
        defaultMonthlyBudgetUsd: Number(defaultBudget) || 10,
      });
      setConfig(updated);
      setOpenRouterApiKey('');
      setOpenRouterMgmtKey('');
      setNotice(`AI provider configuration saved (${updated.activeProvider}).`);
      void loadBilling(Boolean(updated.openRouterMgmtConfigured));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save AI configuration.');
    } finally {
      setSaving(false);
    }
  }

  function updateUsageQuery(patch: Partial<typeof usageQuery>) {
    const next = { ...usageQuery, ...patch };
    setUsageQuery(next);
    void loadBilling(Boolean(config?.openRouterMgmtConfigured), next);
  }

  async function updateUserBudget(userId: string, budget: number, provisionSubKey: boolean) {
    await aiOpenRouterService.updateUserBudget(userId, budget, provisionSubKey);
    setNotice('Updated user AI budget.');
    await loadBilling(Boolean(config?.openRouterMgmtConfigured), usageQuery);
  }

  return {
    config, provider, setProvider, region, fastModel, setFastModel,
    proModel, setProModel, coderModel, setCoderModel, embedModel, setEmbedModel,
    webSearch, setWebSearch, openRouterApiKey, setOpenRouterApiKey,
    openRouterMgmtKey, setOpenRouterMgmtKey, defaultBudget, setDefaultBudget,
    models, credits, usagePage, usageQuery, saving, notice, error,
    handleSyncModels, handleSave, updateUsageQuery, loadBilling, updateUserBudget,
  };
}
