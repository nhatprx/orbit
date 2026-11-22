import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../workspace/httpClient';
import {
  createHttpWhiteboardService,
  isWhiteboardConflictError,
  WHITEBOARD_CONFLICT_CODE,
} from './whiteboard.service';
import type { WhiteboardScope } from '../../types/whiteboard.types';

const WS_SCOPE: WhiteboardScope = {
  type: 'WORKSPACE',
  workspaceId: 'ws 1',
  permissions: ['whiteboard.read', 'whiteboard.write'],
};

const PROJ_SCOPE: WhiteboardScope = {
  type: 'PROJECT',
  workspaceId: 'ws-1',
  projectId: 'proj/2',
  permissions: ['pwhiteboard.read', 'pwhiteboard.write'],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('whiteboard.service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls workspace and project endpoints with encoded path segments and query params', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({ items: [], page: 0, size: 24, totalElements: 0, totalPages: 0, hasMore: false })
      )
      .mockResolvedValueOnce(jsonResponse({ id: 'b1', version: 1, sceneJson: { elements: [] } }, 201))
      .mockResolvedValueOnce(jsonResponse({ id: 'b1', version: 1, sceneJson: { elements: [] } }))
      .mockResolvedValueOnce(jsonResponse({ id: 'b1', title: 'Renamed' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'b1', version: 2, elementCount: 3 }))
      .mockResolvedValueOnce(jsonResponse(null, 204))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ fileId: 'f1', mimeType: 'image/png', dataUrl: 'data:image/png;base64,AA==', byteSize: 1 }))
      .mockResolvedValueOnce(jsonResponse(null, 204));

    const service = createHttpWhiteboardService();
    await service.listBoards(WS_SCOPE, { q: '  arch  ', page: 1, size: 12 });
    await service.createBoard(PROJ_SCOPE, { title: 'System Map', description: 'Core flow' });
    await service.getBoard(PROJ_SCOPE, 'b 1');
    await service.updateBoard(WS_SCOPE, 'b1', { title: 'Renamed' });
    await service.saveScene(PROJ_SCOPE, 'b1', {
      expectedVersion: 1,
      sceneJson: { type: 'excalidraw', version: 2, elements: [], appState: {} },
      elementCount: 3,
    });
    await service.deleteBoard(WS_SCOPE, 'b1');
    await service.listAssets(PROJ_SCOPE, 'b1');
    await service.upsertAsset(PROJ_SCOPE, 'b1', 'file-1', {
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,AA==',
    });
    await service.deleteAsset(WS_SCOPE, 'b1', 'file-1');

    const calls = fetchMock.mock.calls.map(([url, init]) => ({
      url: String(url),
      method: init?.method,
    }));

    expect(calls[0]).toEqual({
      url: expect.stringContaining('/api/v1/workspaces/ws%201/whiteboards?q=arch&page=1&size=12'),
      method: 'GET',
    });
    expect(calls[1]).toEqual({
      url: expect.stringContaining('/api/v1/workspaces/ws-1/projects/proj%2F2/whiteboards'),
      method: 'POST',
    });
    expect(calls[2]?.url).toContain('/projects/proj%2F2/whiteboards/b%201');
    expect(calls[3]).toEqual({
      url: expect.stringContaining('/workspaces/ws%201/whiteboards/b1'),
      method: 'PATCH',
    });
    expect(calls[4]).toEqual({
      url: expect.stringContaining('/projects/proj%2F2/whiteboards/b1/scene'),
      method: 'PUT',
    });
    expect(calls[5]?.method).toBe('DELETE');
    expect(calls[6]?.url).toContain('/projects/proj%2F2/whiteboards/b1/assets');
    expect(calls[7]).toEqual({
      url: expect.stringContaining('/projects/proj%2F2/whiteboards/b1/assets/file-1'),
      method: 'PUT',
    });
    expect(calls[8]).toEqual({
      url: expect.stringContaining('/workspaces/ws%201/whiteboards/b1/assets/file-1'),
      method: 'DELETE',
    });
  });

  it('maps 409 WHITEBOARD_VERSION_CONFLICT envelopes to ApiError and detects conflicts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        {
          code: WHITEBOARD_CONFLICT_CODE,
          message: 'Version mismatch',
          traceId: 't1',
          timestamp: '2026-11-22T00:00:00Z',
          details: [],
        },
        409
      )
    );

    const service = createHttpWhiteboardService();
    let caught: unknown = null;
    try {
      await service.saveScene(WS_SCOPE, 'b1', {
        expectedVersion: 1,
        sceneJson: { elements: [] },
        elementCount: 0,
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(isWhiteboardConflictError(caught)).toBe(true);
    expect(isWhiteboardConflictError(new ApiError(409, 'OTHER', 'Other'))).toBe(false);
    expect(isWhiteboardConflictError(new ApiError(500, WHITEBOARD_CONFLICT_CODE, 'Err'))).toBe(false);
    expect(isWhiteboardConflictError(new Error('plain'))).toBe(false);
  });
});
