import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastViewport } from '../../components/ui/ToastViewport';
import { clearToasts } from '../../components/ui/toastStore';
import { aiChatService } from '../../services/ai.service';
import { aiOpenRouterService } from '../../services/aiOpenRouter.service';
import type { AiProviderConfig } from '../../types/ai.types';
import { AdminAiConfigPanel } from '../dashboard/AdminAiConfigPanel';
import { AdminOverview } from '../dashboard/AdminOverview';

vi.mock('../../services/ai.service', () => ({
  aiChatService: {
    getAdminConfig: vi.fn(),
    updateAdminConfig: vi.fn(),
  },
}));

vi.mock('../../services/aiOpenRouter.service', () => ({
  aiOpenRouterService: {
    listModels: vi.fn(),
    getAdminCredits: vi.fn(),
    listAdminUserUsage: vi.fn(),
    updateUserBudget: vi.fn(),
  },
}));

const mockedAi = vi.mocked(aiChatService);
const mockedOr = vi.mocked(aiOpenRouterService);

function openRouterConfig(overrides: Partial<AiProviderConfig> = {}): AiProviderConfig {
  return {
    activeProvider: 'OPENROUTER',
    bedrockRegion: 'us-east-1',
    fastModel: 'google/gemini-2.5-flash',
    proModel: 'anthropic/claude-3.7-sonnet',
    coderModel: 'anthropic/claude-3.7-sonnet',
    embedModel: 'openai/text-embedding-3-small',
    webSearchEnabled: true,
    bedrockConfigured: false,
    openRouterConfigured: true,
    qdrantConfigured: false,
    tavilyConfigured: false,
    openRouterMgmtConfigured: false,
    defaultMonthlyBudgetUsd: 10,
    updatedAt: null,
    ...overrides,
  };
}

describe('Admin AI Configuration and Overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedOr.listAdminUserUsage.mockResolvedValue({
      items: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 1,
    });
  });

  afterEach(() => {
    clearToasts();
    cleanup();
  });

  it('allows Admin to switch provider from BEDROCK to OPENROUTER', async () => {
    const bedrock = openRouterConfig({
      activeProvider: 'BEDROCK',
      fastModel: 'anthropic.claude-3-5-haiku-20241022-v1:0',
      proModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      coderModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      embedModel: 'amazon.titan-embed-text-v2:0',
      bedrockConfigured: true,
    });
    mockedAi.getAdminConfig.mockResolvedValue(bedrock);
    mockedAi.updateAdminConfig.mockResolvedValue({
      ...bedrock,
      activeProvider: 'OPENROUTER',
      updatedAt: new Date().toISOString(),
    });

    render(<><AdminAiConfigPanel /><ToastViewport /></>);
    await waitFor(() => expect(screen.getByText(/AWS Bedrock Ready/i)).toBeTruthy());

    fireEvent.change(screen.getByDisplayValue(/AWS Bedrock/i), { target: { value: 'OPENROUTER' } });
    fireEvent.click(screen.getByRole('button', { name: /Save AI Configuration/i }));

    await waitFor(() =>
      expect(mockedAi.updateAdminConfig).toHaveBeenCalledWith(
        expect.objectContaining({ activeProvider: 'OPENROUTER' })
      )
    );
    expect(await screen.findByRole('status')).toBeTruthy();
  });

  it('allows Admin to sync OpenRouter models in AdminAiConfigPanel', async () => {
    mockedAi.getAdminConfig.mockResolvedValue(openRouterConfig({ openRouterMgmtConfigured: true }));
    mockedOr.getAdminCredits.mockResolvedValue({
      totalCreditsUsd: 50,
      totalUsageUsd: 12.5,
      remainingCreditsUsd: 37.5,
    });
    mockedOr.listModels.mockResolvedValue([
      {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        contextLength: 1000000,
        promptPricePerMillion: '0.15',
        completionPricePerMillion: '0.60',
      },
    ]);

    render(<><AdminAiConfigPanel /><ToastViewport /></>);
    await waitFor(() => expect(screen.getByText(/\$37\.50/i)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /Sync OpenRouter Models/i }));
    await waitFor(() => expect(mockedOr.listModels).toHaveBeenCalled());
    expect(await screen.findByText(/Synced 1 OpenRouter models/i)).toBeTruthy();
  });

  it('paginates OpenRouter user budgets with Pager in AdminAiConfigPanel', async () => {
    mockedAi.getAdminConfig.mockResolvedValue(openRouterConfig());
    mockedOr.listAdminUserUsage.mockResolvedValue({
      items: [
        {
          userId: 'u-1',
          fullName: 'Alice Orbit',
          email: 'alice@orbit.dev',
          currentMonthCostUsd: 1.5,
          currentMonthTokens: 4500,
          requestCount: 12,
          monthlyBudgetUsd: 10,
          hasProvisionedKey: false,
          hasPersonalKey: false,
        },
      ],
      page: 0,
      size: 10,
      totalElements: 25,
      totalPages: 3,
    });

    render(<><AdminAiConfigPanel /><ToastViewport /></>);
    expect(await screen.findByText('Alice Orbit')).toBeTruthy();
    expect(screen.getByText(/Page 1 of 3/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    await waitFor(() =>
      expect(mockedOr.listAdminUserUsage).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, size: 10 })
      )
    );
  });

  it('splits AdminOverview into AI Keys & Models and AI User Budgets tabs', async () => {
    mockedAi.getAdminConfig.mockResolvedValue(
      openRouterConfig({ fastModel: 'google/gemini-3.5-flash', proModel: 'anthropic/claude-sonnet-4.6', coderModel: 'anthropic/claude-sonnet-4.6' })
    );

    render(
      <AdminOverview
        user={{
          id: 'admin-1',
          name: 'Admin',
          username: 'admin',
          email: 'admin@orbit.dev',
          role: 'admin',
          workspaceId: 'ws-1',
          avatarUrl: null,
        }}
      />
    );

    expect(await screen.findByText(/AI Provider, Keys & Models/i)).toBeTruthy();
    expect(screen.queryByText(/OpenRouter Credits & User Budgets/i)).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /AI User Budgets/i }));
    expect(await screen.findByText(/AI User Usage & Budgets/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Save AI Configuration/i })).toBeNull();
  });
});
