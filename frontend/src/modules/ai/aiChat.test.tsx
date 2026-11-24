import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiChatService } from '../../services/ai.service';
import { aiOpenRouterService } from '../../services/aiOpenRouter.service';
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

describe('Orbit AI Chat', () => {
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
        expect.objectContaining({
          scopeType: 'WORKSPACE',
          workspaceId: 'ws-1',
          content: 'Use PostgreSQL and Qdrant Cloud.',
        })
      )
    );
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
});
