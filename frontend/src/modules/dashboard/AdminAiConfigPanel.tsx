import { useEffect, useState, type FormEvent } from 'react';
import { Bot, Save } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { aiChatService } from '../../services/ai.service';
import type { AiProviderConfig, AiProviderType } from '../../types/ai.types';

const INPUT =
  'w-full border border-[#30363D] bg-[#0D1117] px-2.5 py-1.5 font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function AdminAiConfigPanel() {
  const [config, setConfig] = useState<AiProviderConfig | null>(null);
  const [provider, setProvider] = useState<AiProviderType>('BEDROCK');
  const [region, setRegion] = useState('us-east-1');
  const [fastModel, setFastModel] = useState('');
  const [proModel, setProModel] = useState('');
  const [coderModel, setCoderModel] = useState('');
  const [embedModel, setEmbedModel] = useState('');
  const [webSearch, setWebSearch] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Unable to load AI configuration.');
    });
  }, []);

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
      });
      setConfig(updated);
      setNotice(`AI provider configuration saved (${updated.activeProvider}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save AI configuration.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="AI Provider & Cloud Memory Configuration"
      description="Switch between AWS Bedrock and OpenRouter, map model tiers, and monitor cloud AI dependencies."
      actions={<Bot className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />}
    >
      {config && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone={config.bedrockConfigured ? 'green' : 'neutral'} withDot>
            AWS Bedrock {config.bedrockConfigured ? 'Ready' : 'No Creds'}
          </Badge>
          <Badge tone={config.openRouterConfigured ? 'green' : 'neutral'} withDot>
            OpenRouter {config.openRouterConfigured ? 'Ready' : 'No Key'}
          </Badge>
          <Badge tone={config.qdrantConfigured ? 'green' : 'neutral'} withDot>
            Qdrant Cloud {config.qdrantConfigured ? 'Connected' : 'Fallback PG'}
          </Badge>
          <Badge tone={config.tavilyConfigured ? 'green' : 'neutral'} withDot>
            Tavily Web {config.tavilyConfigured ? 'Ready' : 'No Key'}
          </Badge>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[#8B949E]">Active Cloud Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProviderType)}
              className={INPUT}
            >
              <option value="BEDROCK">AWS Bedrock (Primary)</option>
              <option value="OPENROUTER">OpenRouter (Multi-Model)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8B949E]">AWS Bedrock Region</label>
            <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8B949E]">orbit-fast Model ID</label>
            <input type="text" required value={fastModel} onChange={(e) => setFastModel(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8B949E]">orbit-pro Model ID</label>
            <input type="text" required value={proModel} onChange={(e) => setProModel(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8B949E]">orbit-coder Model ID</label>
            <input type="text" required value={coderModel} onChange={(e) => setCoderModel(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8B949E]">Embedding Model (1024-dim)</label>
            <input type="text" value={embedModel} onChange={(e) => setEmbedModel(e.target.value)} className={INPUT} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-[#E6EDF3]">
          <input
            type="checkbox"
            checked={webSearch}
            onChange={(e) => setWebSearch(e.target.checked)}
            className="accent-[#22C55E]"
          />
          Allow external web search in Orbit AI
        </label>

        {notice && (
          <p role="status" className="border border-[#22C55E] bg-[#052E16] px-3 py-2 text-xs text-[#22C55E]">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={saving}>
          <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
          {saving ? 'Saving...' : 'Save AI Configuration'}
        </Button>
      </form>
    </Panel>
  );
}
