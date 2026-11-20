import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiChatService } from '../../services/ai.service';
import { AdminAiConfigPanel } from '../dashboard/AdminAiConfigPanel';
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

const mockedAi = vi.mocked(aiChatService);

describe('Orbit AI Chat and Admin AI Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAi.listThreads.mockResolvedValue([]);
    mockedAi.listMessages.mockResolvedValue([]);
    mockedAi.listMemories.mockResolvedValue([]);
    mockedAi.listIndexedFiles.mockResolvedValue([]);
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
});
