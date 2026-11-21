import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../services/workspace/httpClient';
import { chatService } from '../../services/workspace/services';
import type {
  ChatChannelDto,
  CreateChatChannelRequest,
  UpdateChatChannelRequest,
} from '../../types/workspace.types';

/** Loads and mutates chat channels for the active workspace or project scope. */
export function useChatChannels(workspaceId: string, projectId: string | null) {
  const [channels, setChannels] = useState<ChatChannelDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async (): Promise<ChatChannelDto[]> => {
    return projectId
      ? chatService.listProjectChannels(workspaceId, projectId)
      : chatService.listWorkspaceChannels(workspaceId);
  }, [workspaceId, projectId]);

  const reload = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await fetchChannels();
      setChannels(list);
    } catch (err) {
      setError(errorMessage(err, 'Could not load chat channels.'));
    } finally {
      setLoading(false);
    }
  }, [fetchChannels]);

  useEffect(() => {
    let active = true;
    setChannels([]);
    setError(null);
    setLoading(true);

    fetchChannels()
      .then((list) => {
        if (active) setChannels(list);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err, 'Could not load chat channels.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchChannels]);

  const createChannel = useCallback(
    async (request: CreateChatChannelRequest): Promise<ChatChannelDto> => {
      const created = projectId
        ? await chatService.createProjectChannel(workspaceId, projectId, request)
        : await chatService.createWorkspaceChannel(workspaceId, request);
      setChannels((current) =>
        current.some((c) => c.id === created.id)
          ? current.map((c) => (c.id === created.id ? created : c))
          : [...current, created]
      );
      return created;
    },
    [workspaceId, projectId]
  );

  const updateChannel = useCallback(
    async (channelId: string, request: UpdateChatChannelRequest): Promise<ChatChannelDto> => {
      const updated = await chatService.updateChannel(channelId, request);
      setChannels((current) => current.map((c) => (c.id === updated.id ? updated : c)));
      return updated;
    },
    []
  );

  const deleteChannel = useCallback(async (channelId: string): Promise<void> => {
    await chatService.deleteChannel(channelId);
    setChannels((current) => current.filter((c) => c.id !== channelId));
  }, []);

  return {
    channels,
    loading,
    error,
    reload,
    createChannel,
    updateChannel,
    deleteChannel,
  };
}
