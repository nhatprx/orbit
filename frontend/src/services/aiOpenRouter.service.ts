import type {
  AdminUserAiUsagePage,
  AiUsageSummary,
  OpenRouterCredits,
  OpenRouterModel,
} from '../types/ai.types';
import { apiRequest } from './workspace/httpClient';

export const aiOpenRouterService = {
  listModels(): Promise<OpenRouterModel[]> {
    return apiRequest<OpenRouterModel[]>('GET', '/api/v1/ai/openrouter/models');
  },

  getMyUsage(): Promise<AiUsageSummary> {
    return apiRequest<AiUsageSummary>('GET', '/api/v1/ai/usage/me');
  },

  exchangeOAuthCode(code: string, codeVerifier: string): Promise<AiUsageSummary> {
    return apiRequest<AiUsageSummary>('POST', '/api/v1/ai/openrouter/oauth/exchange', {
      body: { code, codeVerifier },
    });
  },

  savePersonalKey(apiKey: string): Promise<AiUsageSummary> {
    return apiRequest<AiUsageSummary>('PUT', '/api/v1/ai/openrouter/personal-key', {
      body: { apiKey },
    });
  },

  clearPersonalKey(): Promise<AiUsageSummary> {
    return apiRequest<AiUsageSummary>('DELETE', '/api/v1/ai/openrouter/personal-key');
  },

  getAdminCredits(): Promise<OpenRouterCredits> {
    return apiRequest<OpenRouterCredits>('GET', '/api/v1/admin/ai/openrouter/credits');
  },

  listAdminUserUsage(query?: { page?: number; size?: number; search?: string }): Promise<AdminUserAiUsagePage> {
    return apiRequest<AdminUserAiUsagePage>('GET', '/api/v1/admin/ai/openrouter/usage', {
      query: {
        page: query?.page ?? 0,
        size: query?.size ?? 10,
        search: query?.search?.trim() || undefined,
      },
    });
  },

  updateUserBudget(userId: string, monthlyBudgetUsd: number, provisionSubKey: boolean): Promise<void> {
    return apiRequest<void>('PUT', `/api/v1/admin/ai/openrouter/users/${userId}/budget`, {
      body: { monthlyBudgetUsd, provisionSubKey },
    });
  },
};
