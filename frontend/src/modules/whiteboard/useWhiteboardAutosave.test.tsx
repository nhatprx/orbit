import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/workspace/httpClient';
import { WHITEBOARD_CONFLICT_CODE } from '../../services/whiteboard/whiteboard.service';
import { useWhiteboardAutosave } from './useWhiteboardAutosave';
import { WHITEBOARD_MAX_ASSET_BYTES } from './whiteboardPermissions';
import {
  makeMockWhiteboardService,
  makeTestBoardDetail,
  makeTestSnapshot,
  TEST_WS_SCOPE,
} from './whiteboardTestFixtures';

describe('useWhiteboardAutosave', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores baseline and no-op updates, debounces saves, and uploads new image assets once', async () => {
    const service = makeMockWhiteboardService();
    const { result } = renderHook(() =>
      useWhiteboardAutosave({
        scope: TEST_WS_SCOPE,
        boardId: 'b-1',
        canWrite: true,
        service,
        debounceMs: 40,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleSceneChange(makeTestSnapshot(10)));
    expect(result.current.saveState).toBe('saved');

    act(() => result.current.handleSceneChange(makeTestSnapshot(10)));
    expect(result.current.saveState).toBe('saved');

    const imgFile = {
      fileId: 'img-1',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,AAAA',
      byteSize: 3,
    };
    act(() => result.current.handleSceneChange(makeTestSnapshot(11, [imgFile])));
    expect(result.current.saveState).toBe('unsaved');

    await waitFor(() => expect(result.current.saveState).toBe('saved'));
    expect(service.upsertAsset).toHaveBeenCalledTimes(1);
    expect(service.saveScene).toHaveBeenCalledWith(
      TEST_WS_SCOPE,
      'b-1',
      expect.objectContaining({ expectedVersion: 1 })
    );
    expect(result.current.board?.version).toBe(2);

    act(() => result.current.handleSceneChange(makeTestSnapshot(12, [imgFile])));
    await act(async () => {
      await result.current.saveNow();
    });
    expect(service.upsertAsset).toHaveBeenCalledTimes(1);
    expect(service.saveScene).toHaveBeenCalledTimes(2);
  });

  it('handles 409 conflict with reloadLatest and overwriteServer recovery', async () => {
    const conflictErr = new ApiError(409, WHITEBOARD_CONFLICT_CODE, 'Conflict');
    const getBoard = vi
      .fn()
      .mockResolvedValueOnce(makeTestBoardDetail(1))
      .mockResolvedValueOnce(makeTestBoardDetail(4))
      .mockResolvedValueOnce(makeTestBoardDetail(5));
    const saveScene = vi
      .fn()
      .mockRejectedValueOnce(conflictErr)
      .mockResolvedValueOnce({
        id: 'b-1',
        version: 5,
        elementCount: 1,
        updatedBy: 'u-1',
        updatedAt: 'now',
      });

    const service = makeMockWhiteboardService({ getBoard, saveScene });
    const { result } = renderHook(() =>
      useWhiteboardAutosave({
        scope: TEST_WS_SCOPE,
        boardId: 'b-1',
        canWrite: true,
        service,
        debounceMs: 500,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleSceneChange(makeTestSnapshot(1)));
    act(() => result.current.handleSceneChange(makeTestSnapshot(2)));

    await act(async () => {
      const savePromise = result.current.saveNow();
      // Queue another edit while the conflicting save is still in flight; it must not overwrite conflict state.
      result.current.handleSceneChange(makeTestSnapshot(3));
      await savePromise;
    });
    expect(result.current.saveState).toBe('conflict');
    expect(saveScene).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.overwriteServer();
    });
    expect(saveScene).toHaveBeenLastCalledWith(
      TEST_WS_SCOPE,
      'b-1',
      expect.objectContaining({ expectedVersion: 4 })
    );
    expect(result.current.saveState).toBe('saved');

    const prevTick = result.current.canvasResetTick;
    await act(async () => {
      await result.current.reloadLatest();
    });
    expect(result.current.canvasResetTick).toBe(prevTick + 1);
    expect(result.current.board?.version).toBe(5);
  });

  it('rejects oversized assets (> 5 MB) and blocks mutations in read-only mode', async () => {
    const service = makeMockWhiteboardService();
    const { result } = renderHook(() =>
      useWhiteboardAutosave({
        scope: TEST_WS_SCOPE,
        boardId: 'b-1',
        canWrite: true,
        service,
        debounceMs: 500,
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleSceneChange(makeTestSnapshot(1)));
    act(() =>
      result.current.handleSceneChange(
        makeTestSnapshot(2, [
          {
            fileId: 'huge',
            mimeType: 'image/png',
            dataUrl: `data:image/png;base64,${'A'.repeat(WHITEBOARD_MAX_ASSET_BYTES + 16)}`,
            byteSize: 4 * 1024 * 1024,
          },
        ])
      )
    );
    await act(async () => {
      await result.current.saveNow();
    });
    expect(result.current.saveState).toBe('error');
    expect(result.current.saveError).toContain('5 MB');
    expect(service.upsertAsset).not.toHaveBeenCalled();

    const ro = renderHook(() =>
      useWhiteboardAutosave({
        scope: TEST_WS_SCOPE,
        boardId: 'b-1',
        canWrite: false,
        service,
        debounceMs: 10,
      })
    );
    await waitFor(() => expect(ro.result.current.loading).toBe(false));
    act(() => ro.result.current.handleSceneChange(makeTestSnapshot(1)));
    act(() => ro.result.current.handleSceneChange(makeTestSnapshot(2)));
    expect(ro.result.current.saveState).toBe('saved');
    expect(service.saveScene).not.toHaveBeenCalled();
  });
});
