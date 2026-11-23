import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiChatService } from '../../services/ai.service';
import { aiOpenRouterService } from '../../services/aiOpenRouter.service';
import { AdminAiConfigPanel } from '../dashboard/AdminAiConfigPanel';
import { AdminOverview } from '../dashboard/AdminOverview';
import { AiChatPage } from './AiChatPage';

vi.mock('../../services/ai.service', () => ({
  aiChatService: {
    listThreads: vi.fn(),
    createThread: vi.fn(),
    deleteThread: vi.fn(),
    listMessages: vi.fn(),
    streamPrompt: vi.fn(),
    listMemories: vi.fn(),
    createMemory: vi.fn(),
    deleteMemory: vi.fn(),
    listIndexedFiles: vi.fn(),
    triggerFileIndex: vi.fn(),
    getAdminConfig: vi.fn(),
    updateAdminConfig: vi.fn(),
  },
}));

vi.mock('../../services/aiOpenRouter.service', () => ({
  aiOpenRouterService: {
    listModels: vi.fn(),
    getMyUsage: vi.fn(),
    exchangeOAuthCode: vi.fn(),
    savePersonalKey: vi.fn(),
    clearPersonalKey: vi.fn(),
    getAdminCredits: vi.fn(),
    listAdminUserUsage: vi.fn(),
    updateUserBudget: vi.fn(),
  },
}));

const mockedAi = vi.mocked(aiChatService);
const mockedOr = vi.mocked(aiOpenRouterService);

describe('Orbit AI Chat and Admin AI Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAi.listThreads.mockResolvedValue([]);
    mockedAi.listMessages.mockResolvedValue([]);
    mockedAi.listMemories.mockResolvedValue([]);
    mockedAi.listIndexedFiles.mockResolvedValue([]);
    mockedOr.getMyUsage.mockResolvedValue({
      currentMonthCostUsd: 1.25,
      totalCostUsd: 3.5,
      monthlyBudgetUsd: 10,
      remainingBudgetUsd: 8.75,
      currentMonthInputTokens: 1200,
      currentMonthOutputTokens: 800,
      keySource: 'SYSTEM',
      hasPersonalKey: false,
      personalKeyPreview: null,
      hasProvisionedKey: false,
      recentEntries: [],
    });
    mockedOr.listAdminUserUsage.mockResolvedValue({
      items: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 1,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('opens Memory drawer and saves a scoped memory item', async () => {
    mockedAi.createMemory.mockResolvedValue({
      id: 'm-1',
      scopeType: 'WORKSPACE',
      workspaceId: 'ws-1',
      projectId: null,
      category: 'DECISION',
      content: 'Use PostgreSQL and Qdrant Cloud.',
      pinned: false,
      vectorIndexed: true,
      updatedAt: new Date().toISOString(),
    });

    render(<AiChatPage workspaceId="ws-1" workspaceName="Orbit Core" />);
    fireEvent.click(screen.getByRole('button', { name: /Memory/i }));

    const input = screen.getByPlaceholderText(/Add a persistent fact/i);
    fireEvent.change(input, { target: { value: 'Use PostgreSQL and Qdrant Cloud.' } });
    fireEvent.click(screen.getByRole('button', { name: /Save memory/i }));

    await waitFor(() =>
      expect(mockedAi.createMemory).toHaveBeenCalledWith(
        expect.objectContaining({ scopeType: 'WORKSPACE', workspaceId: 'ws-1', content: 'Use PostgreSQL and Qdrant Cloud.' })
      )
    );
  });

  it('allows Admin to switch provider from BEDROCK to OPENROUTER', async () => {
    mockedAi.getAdminConfig.mockResolvedValue({
      activeProvider: 'BEDROCK',
      bedrockRegion: 'us-east-1',
      fastModel: 'anthropic.claude-3-5-haiku-20241022-v1:0',
      proModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      coderModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      embedModel: 'amazon.titan-embed-text-v2:0',
      webSearchEnabled: true,
      bedrockConfigured: true,
      openRouterConfigured: true,
      qdrantConfigured: false,
      tavilyConfigured: false,
      updatedAt: null,
    });
    mockedAi.updateAdminConfig.mockResolvedValue({
      activeProvider: 'OPENROUTER',
      bedrockRegion: 'us-east-1',
      fastModel: 'anthropic.claude-3-5-haiku-20241022-v1:0',
      proModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      coderModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      embedModel: 'amazon.titan-embed-text-v2:0',
      webSearchEnabled: true,
      bedrockConfigured: true,
      openRouterConfigured: true,
      qdrantConfigured: false,
      tavilyConfigured: false,
      updatedAt: new Date().toISOString(),
    });

    render(<AdminAiConfigPanel />);
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

  it('opens Spend & Keys drawer and saves a personal OpenRouter key', async () => {
    mockedOr.savePersonalKey.mockResolvedValue({
      currentMonthCostUsd: 1.25,
      totalCostUsd: 3.5,
      monthlyBudgetUsd: 10,
      remainingBudgetUsd: 8.75,
      currentMonthInputTokens: 1200,
      currentMonthOutputTokens: 800,
      keySource: 'PERSONAL',
      hasPersonalKey: true,
      personalKeyPreview: 'sk-or-...9999',
      hasProvisionedKey: false,
      recentEntries: [],
    });

    render(<AiChatPage workspaceId="ws-1" workspaceName="Orbit Core" />);
    const spendBtn = await screen.findByRole('button', { name: /\$1\.25/i });
    fireEvent.click(spendBtn);

    expect(screen.getByText(/Connect with OpenRouter/i)).toBeTruthy();
    const keyInput = screen.getByPlaceholderText(/sk-or-v1-/i);
    fireEvent.change(keyInput, { target: { value: 'sk-or-v1-test-9999' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => expect(mockedOr.savePersonalKey).toHaveBeenCalledWith('sk-or-v1-test-9999'));
    expect(await screen.findByText(/Connected: sk-or-\.\.\.9999/i)).toBeTruthy();
  });

  it('allows Admin to sync OpenRouter models in AdminAiConfigPanel', async () => {
    mockedAi.getAdminConfig.mockResolvedValue({
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
      openRouterMgmtConfigured: true,
      defaultMonthlyBudgetUsd: 10,
      updatedAt: null,
    });
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

    render(<AdminAiConfigPanel />);
    await waitFor(() => expect(screen.getByText(/\$37\.50/i)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /Sync OpenRouter Models/i }));
    await waitFor(() => expect(mockedOr.listModels).toHaveBeenCalled());
    expect(await screen.findByText(/Synced 1 OpenRouter models/i)).toBeTruthy();
  });

  it('paginates OpenRouter user budgets with Pager in AdminAiConfigPanel', async () => {
    mockedAi.getAdminConfig.mockResolvedValue({
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
    });
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

    render(<AdminAiConfigPanel />);
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
    mockedAi.getAdminConfig.mockResolvedValue({
      activeProvider: 'OPENROUTER',
      bedrockRegion: 'us-east-1',
      fastModel: 'google/gemini-3.5-flash',
      proModel: 'anthropic/claude-sonnet-4.6',
      coderModel: 'anthropic/claude-sonnet-4.6',
      embedModel: 'openai/text-embedding-3-small',
      webSearchEnabled: true,
      bedrockConfigured: false,
      openRouterConfigured: true,
      qdrantConfigured: false,
      tavilyConfigured: false,
      openRouterMgmtConfigured: false,
      defaultMonthlyBudgetUsd: 10,
      updatedAt: null,
    });

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
