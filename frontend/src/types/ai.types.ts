export type AiModelId = 'orbit-pro' | 'orbit-fast' | 'orbit-coder';
export type AiScopeType = 'USER' | 'WORKSPACE' | 'PROJECT';
export type AiProviderType = 'BEDROCK' | 'OPENROUTER';

export interface AiToolTrace {
  tool: string;
  status: string;
  summary: string;
}

export interface AiCitation {
  type: string;
  label: string;
  ref: string;
}

export interface AiThread {
  id: string;
  scopeType: AiScopeType;
  workspaceId: string | null;
  projectId: string | null;
  title: string;
  model: AiModelId;
  messageCount: number;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string | null;
  providerUsed?: string | null;
  toolTraces: AiToolTrace[];
  citations: AiCitation[];
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  generationId?: string | null;
  timestamp: string;
}

export interface AiMemory {
  id: string;
  scopeType: AiScopeType;
  workspaceId: string | null;
  projectId: string | null;
  category: 'FACT' | 'DECISION' | 'PREFERENCE';
  content: string;
  pinned: boolean;
  vectorIndexed: boolean;
  updatedAt: string;
}

export interface AiDocumentIndex {
  nodeId: string;
  filename: string;
  status: 'PENDING' | 'INDEXING' | 'READY' | 'UNSUPPORTED' | 'FAILED';
  chunkCount: number;
  errorMessage: string | null;
  indexedAt: string | null;
  updatedAt: string | null;
}

export interface AiProviderConfig {
  activeProvider: AiProviderType;
  bedrockRegion: string;
  fastModel: string;
  proModel: string;
  coderModel: string;
  embedModel: string;
  webSearchEnabled: boolean;
  bedrockConfigured: boolean;
  openRouterConfigured: boolean;
  qdrantConfigured: boolean;
  tavilyConfigured: boolean;
  openRouterApiKeyPreview?: string | null;
  openRouterMgmtConfigured?: boolean;
  openRouterMgmtKeyPreview?: string | null;
  defaultMonthlyBudgetUsd?: number;
  updatedAt: string | null;
}

export interface UpdateAiProviderConfigPayload {
  activeProvider: AiProviderType;
  bedrockRegion: string;
  fastModel: string;
  proModel: string;
  coderModel: string;
  embedModel: string;
  webSearchEnabled: boolean;
  openRouterApiKey?: string;
  openRouterMgmtKey?: string;
  defaultMonthlyBudgetUsd?: number;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  contextLength: number;
  promptPricePerMillion: string;
  completionPricePerMillion: string;
}

export interface OpenRouterCredits {
  totalCreditsUsd: number;
  totalUsageUsd: number;
  remainingCreditsUsd: number;
}

export interface AiUsageEntry {
  id: string;
  threadId: string | null;
  modelUsed: string;
  providerUsed: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  keySource: string;
  createdAt: string;
}

export interface AiUsageSummary {
  currentMonthCostUsd: number;
  totalCostUsd: number;
  monthlyBudgetUsd: number;
  remainingBudgetUsd: number;
  currentMonthInputTokens: number;
  currentMonthOutputTokens: number;
  keySource: string;
  hasPersonalKey: boolean;
  personalKeyPreview: string | null;
  hasProvisionedKey: boolean;
  recentEntries: AiUsageEntry[];
}

export interface AdminUserAiUsage {
  userId: string;
  fullName: string;
  email: string;
  currentMonthCostUsd: number;
  currentMonthTokens: number;
  requestCount: number;
  monthlyBudgetUsd: number;
  hasProvisionedKey: boolean;
  hasPersonalKey: boolean;
  modelsUsed?: string[];
}

export interface AdminUserAiUsagePage {
  items: AdminUserAiUsage[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
