import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { collabClient } from '../../services/collab/collabClient';
import type { CollabRoomEvent } from '../../types/collab.types';

vi.mock('@excalidraw/excalidraw', () => ({
  reconcileElements: (_local: unknown, remote: unknown) => remote,
  CaptureUpdateAction: { NEVER: 'NEVER' },
}));

import { WhiteboardCard } from './WhiteboardCard';
import { useWhiteboardCollab } from './useWhiteboardCollab';
import { makeTestBoardSummary, makeTestSnapshot } from './whiteboardTestFixtures';

describe('useWhiteboardCollab', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('handles delta sync, collaborator cursors, checkpoints, assets, and lock broadcasts', () => {
    vi.useFakeTimers();
    let emitEvent: ((ev: CollabRoomEvent) => void) | null = null;
    vi.spyOn(collabClient, 'subscribeRoom').mockImplementation((_kind, _id, onEvent) => {
      emitEvent = onEvent;
      return vi.fn();
    });
    const sendEditSpy = vi.spyOn(collabClient, 'sendEdit').mockImplementation(() => {});
    const sendPresenceSpy = vi.spyOn(collabClient, 'sendPresence').mockImplementation(() => {});

    const onSceneChange = vi.fn();
    const onRemoteCheckpoint = vi.fn();
    const onRemoteLockChanged = vi.fn();
    const onRemoteAssetReady = vi.fn();

    const { result } = renderHook(() =>
      useWhiteboardCollab({
        boardId: 'b-1',
        canWrite: true,
        onSceneChange,
        onRemoteCheckpoint,
        onRemoteLockChanged,
        onRemoteAssetReady,
      })
    );

    const updateScene = vi.fn();
    const fakeApi = {
      getSceneElements: () => [{ id: 'el-1', version: 1, versionNonce: 10 }],
      getSceneElementsIncludingDeleted: () => [{ id: 'el-1', version: 1, versionNonce: 10 }],
      getAppState: () => ({ selectedElementIds: { 'el-1': true } }),
      updateScene,
    } as unknown as ExcalidrawImperativeAPI;

    act(() => result.current.handleApiReady(fakeApi));

    const snap = makeTestSnapshot(2);
    snap.sceneJson = {
      type: 'excalidraw',
      version: 2,
      elements: [{ id: 'el-1', version: 2, versionNonce: 11 }],
      appState: {},
    };
    act(() => result.current.handleCollabSceneChange(snap));
    vi.advanceTimersByTime(70);
    expect(sendEditSpy).toHaveBeenCalledWith(
      'whiteboard',
      'b-1',
      'EXCALIDRAW_ELEMENTS',
      expect.objectContaining({ elements: [{ id: 'el-1', version: 2, versionNonce: 11 }] })
    );

    vi.setSystemTime(new Date(Date.now() + 200));
    act(() =>
      result.current.handlePointerUpdate({
        pointer: { x: 42, y: 84, tool: 'pointer' },
        button: 'up',
      })
    );
    expect(sendPresenceSpy).toHaveBeenCalledWith(
      'whiteboard',
      'b-1',
      expect.objectContaining({ action: 'CURSOR' })
    );

    act(() => {
      emitEvent?.({
        type: 'CONTENT_DELTA',
        resourceKind: 'WHITEBOARD',
        resourceId: 'b-1',
        senderUserId: 'u-2',
        senderSessionId: 's-2',
        senderDisplayName: 'Bob',
        seq: 2,
        timestamp: '2026-11-22T00:00:00Z',
        payload: {
          subType: 'EXCALIDRAW_ELEMENTS',
          payload: { elements: [{ id: 'el-2', version: 1, versionNonce: 5 }] },
        },
      });
    });
    expect(updateScene).toHaveBeenCalled();

    act(() => {
      emitEvent?.({
        type: 'SAVED_CHECKPOINT',
        resourceKind: 'WHITEBOARD',
        resourceId: 'b-1',
        senderUserId: 'u-2',
        senderSessionId: 's-2',
        senderDisplayName: 'Bob',
        seq: 3,
        timestamp: '2026-11-22T00:01:00Z',
        payload: { version: 7, updatedAt: '2026-11-22T00:01:00Z' },
      });
      emitEvent?.({
        type: 'ASSET_READY',
        resourceKind: 'WHITEBOARD',
        resourceId: 'b-1',
        senderUserId: 'u-2',
        senderSessionId: 's-2',
        senderDisplayName: 'Bob',
        seq: 4,
        timestamp: '2026-11-22T00:01:00Z',
        payload: { fileId: 'f-9' },
      });
      emitEvent?.({
        type: 'LOCK_CHANGED',
        resourceKind: 'WHITEBOARD',
        resourceId: 'b-1',
        senderUserId: 'u-1',
        senderSessionId: 's-1',
        senderDisplayName: 'Owner',
        seq: 5,
        timestamp: '2026-11-22T00:02:00Z',
        payload: { locked: true, lockedBy: 'u-1' },
      });
    });

    expect(onRemoteCheckpoint).toHaveBeenCalledWith(7, '2026-11-22T00:01:00Z');
    expect(onRemoteAssetReady).toHaveBeenCalledTimes(1);
    expect(onRemoteLockChanged).toHaveBeenCalledWith(true, 'u-1', null);
  });
});

describe('WhiteboardCard owner lock enforcement', () => {
  it('disables rename and delete when locked while allowing owner unlock', () => {
    const board = makeTestBoardSummary({ locked: true, canToggleLock: true });
    const onToggleLock = vi.fn();
    render(
      <WhiteboardCard
        board={board}
        permissions={{ canRead: true, canWrite: true, canDelete: true, canManage: true }}
        onOpen={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onToggleLock={onToggleLock}
      />
    );

    expect(screen.getByTestId('whiteboard-card-locked-b-1')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Rename Architecture Map' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Delete Architecture Map' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Unlock Architecture Map' }));
    expect(onToggleLock).toHaveBeenCalledWith(board, false);
  });
});
