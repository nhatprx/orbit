import { describe, expect, it, vi } from 'vitest';
import type { CloudNodeDto, InitUploadResponse } from '../../types/cloud.types';
import { cloudBasePath, createHttpCloudFilesApi, type CloudFilesApi } from './cloudApi';
import { UploadCancelledError, uploadCloudFile, type PutChunkFn } from './cloudUpload.service';

const SAMPLE_NODE: CloudNodeDto = {
  id: 'n-1', scopeType: 'USER', scopeId: 'u-1', parentId: null, nodeType: 'FILE',
  name: 'spec.pdf', mimeType: 'application/pdf', sizeBytes: 100, starred: false, depth: 0,
  createdBy: 'u-1', createdByName: 'Alice', deletedAt: null, purgeAfter: null,
  createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z',
};

function makeApiMock(overrides: Partial<CloudFilesApi> = {}): CloudFilesApi {
  return {
    listNodes: vi.fn(), getBreadcrumbs: vi.fn(), getQuota: vi.fn(), createFolder: vi.fn(),
    updateNode: vi.fn(), softDeleteNode: vi.fn(), restoreNode: vi.fn(), permanentDeleteNode: vi.fn(),
    emptyTrash: vi.fn(), initUpload: vi.fn(), signUploadParts: vi.fn(),
    completeUpload: vi.fn().mockResolvedValue(SAMPLE_NODE),
    abortUpload: vi.fn().mockResolvedValue(undefined),
    getDownloadUrl: vi.fn(), createDocument: vi.fn(), getTextContent: vi.fn(),
    saveTextContent: vi.fn(), getOfficeContent: vi.fn(), saveOfficeContent: vi.fn(),
    ...overrides,
  };
}

describe('cloudBasePath and 3-layer routing', () => {
  it('builds isolated base paths for USER, WORKSPACE, and PROJECT scopes', () => {
    expect(cloudBasePath({ type: 'USER' })).toBe('/api/v1/cloud/me');
    expect(cloudBasePath({ type: 'WORKSPACE', workspaceId: 'ws-1', permissions: [] })).toBe(
      '/api/v1/workspaces/ws-1/cloud'
    );
    expect(
      cloudBasePath({ type: 'PROJECT', workspaceId: 'ws/1', projectId: 'pr 2', permissions: [] })
    ).toBe('/api/v1/workspaces/ws%2F1/projects/pr%202/cloud');
  });

  it('sends requests to the scoped HTTP endpoint with query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], nextCursor: null, hasMore: false, limit: 25 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const api = createHttpCloudFilesApi({ type: 'WORKSPACE', workspaceId: 'ws-9', permissions: ['files.read'] });
    await api.listNodes({ view: 'TRASH', sortBy: 'size', sortDir: 'desc', q: 'report' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/workspaces/ws-9/cloud/nodes?');
    expect(url).toContain('view=TRASH');
    expect(url).toContain('sortBy=size');
    expect(url).toContain('sortDir=desc');
    expect(url).toContain('q=report');
    expect(init.method).toBe('GET');
  });

  it('fetches and saves Orbit Office document content via office-content endpoint', async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify(SAMPLE_NODE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const api = createHttpCloudFilesApi({ type: 'USER' });
    await api.getOfficeContent('node-42');
    await api.saveOfficeContent('node-42', {
      format: 'DOCX',
      expectedUpdatedAt: '2026-11-20T00:00:00Z',
      doc: { blocks: [{ type: 'p', text: 'Orbit' }], tables: [] },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [getUrl, getInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(getUrl).toContain('/api/v1/cloud/me/nodes/node-42/office-content');
    expect(getInit.method).toBe('GET');

    const [putUrl, putInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(putUrl).toContain('/api/v1/cloud/me/nodes/node-42/office-content');
    expect(putInit.method).toBe('PUT');
  });
});

describe('uploadCloudFile engine', () => {
  it('completes a SINGLE presigned PUT upload and reports progress', async () => {
    const initResp: InitUploadResponse = {
      sessionId: 'sess-1',
      nodeId: 'n-1',
      strategy: 'SINGLE',
      uploadUrl: 'https://s3.local/put-1',
      uploadHeaders: { 'Content-Type': 'text/plain' },
      partSizeBytes: 1024,
      totalParts: 1,
      expiresAt: '2026-11-20T01:00:00Z',
    };
    const api = makeApiMock({ initUpload: vi.fn().mockResolvedValue(initResp) });
    const putChunk = vi.fn<PutChunkFn>(async (_url, body, _headers, onProgress) => {
      onProgress(body.size);
      return { etag: 'etag-1' };
    });
    const progressCalls: number[] = [];
    const file = new File(['hello world'], 'notes.txt', { type: 'text/plain' });

    const node = await uploadCloudFile({
      api,
      file,
      parentId: 'folder-1',
      putChunk,
      onProgress: (loaded) => progressCalls.push(loaded),
    });

    expect(node.id).toBe('n-1');
    expect(putChunk).toHaveBeenCalledWith(
      'https://s3.local/put-1',
      file,
      { 'Content-Type': 'text/plain' },
      expect.any(Function),
      undefined
    );
    expect(api.completeUpload).toHaveBeenCalledWith('sess-1', {}, undefined);
    expect(progressCalls[progressCalls.length - 1]).toBe(file.size);
  });

  it('slices and uploads MULTIPART chunks with sorted ETags', async () => {
    const initResp: InitUploadResponse = {
      sessionId: 'sess-mp',
      nodeId: 'n-2',
      strategy: 'MULTIPART',
      uploadUrl: null,
      uploadHeaders: {},
      partSizeBytes: 4,
      totalParts: 3,
      expiresAt: '2026-11-20T01:00:00Z',
    };
    const api = makeApiMock({
      initUpload: vi.fn().mockResolvedValue(initResp),
      signUploadParts: vi.fn().mockResolvedValue({
        parts: [
          { partNumber: 1, uploadUrl: 'https://s3.local/p1' },
          { partNumber: 2, uploadUrl: 'https://s3.local/p2' },
          { partNumber: 3, uploadUrl: 'https://s3.local/p3' },
        ],
        expiresAt: '2026-11-20T01:00:00Z',
      }),
    });
    const putChunk = vi.fn<PutChunkFn>(async (url, body, _headers, onProgress) => {
      onProgress(body.size);
      return { etag: `etag-${url.slice(-2)}` };
    });
    const file = new File(['abcdefghij'], 'big.bin', { type: 'application/octet-stream' });

    await uploadCloudFile({ api, file, parentId: null, concurrency: 2, putChunk });

    expect(api.signUploadParts).toHaveBeenCalledWith('sess-mp', { partNumbers: [1, 2, 3] }, undefined);
    expect(putChunk).toHaveBeenCalledTimes(3);
    expect(api.completeUpload).toHaveBeenCalledWith(
      'sess-mp',
      {
        parts: [
          { partNumber: 1, etag: 'etag-p1' },
          { partNumber: 2, etag: 'etag-p2' },
          { partNumber: 3, etag: 'etag-p3' },
        ],
      },
      undefined
    );
  });

  it('aborts the upload session when cancelled mid-flight', async () => {
    const controller = new AbortController();
    const api = makeApiMock({
      initUpload: vi.fn().mockResolvedValue({
        sessionId: 'sess-abort',
        nodeId: 'n-3',
        strategy: 'SINGLE',
        uploadUrl: 'https://s3.local/put',
        uploadHeaders: {},
        partSizeBytes: 1024,
        totalParts: 1,
        expiresAt: '2026-11-20T01:00:00Z',
      }),
    });
    const putChunk = vi.fn<PutChunkFn>(async () => {
      controller.abort();
      throw new UploadCancelledError();
    });
    const file = new File(['abc'], 'cancel.txt', { type: 'text/plain' });

    await expect(
      uploadCloudFile({ api, file, parentId: null, signal: controller.signal, putChunk })
    ).rejects.toBeInstanceOf(UploadCancelledError);
    expect(api.abortUpload).toHaveBeenCalledWith('sess-abort');
  });
});
