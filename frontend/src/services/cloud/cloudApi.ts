import type {
  CloudBreadcrumbsResponse,
  CloudDownloadResponse,
  CloudNodeDto,
  CloudQuotaDto,
  CloudScope,
  CompleteUploadRequest,
  CreateFolderRequest,
  EmptyTrashResponse,
  InitUploadRequest,
  InitUploadResponse,
  ListCloudNodesParams,
  SignPartsRequest,
  SignPartsResponse,
  UpdateCloudNodeRequest,
} from '../../types/cloud.types';
import type { CursorPageResponse } from '../../types/workspace.types';
import { apiRequest, seg } from '../workspace/httpClient';

export interface CloudFilesApi {
  listNodes(params?: ListCloudNodesParams, signal?: AbortSignal): Promise<CursorPageResponse<CloudNodeDto>>;
  getBreadcrumbs(nodeId: string, signal?: AbortSignal): Promise<CloudBreadcrumbsResponse>;
  getQuota(signal?: AbortSignal): Promise<CloudQuotaDto>;
  createFolder(body: CreateFolderRequest): Promise<CloudNodeDto>;
  updateNode(nodeId: string, body: UpdateCloudNodeRequest): Promise<CloudNodeDto>;
  softDeleteNode(nodeId: string): Promise<CloudNodeDto>;
  restoreNode(nodeId: string): Promise<CloudNodeDto>;
  permanentDeleteNode(nodeId: string): Promise<void>;
  emptyTrash(): Promise<EmptyTrashResponse>;
  initUpload(body: InitUploadRequest, signal?: AbortSignal): Promise<InitUploadResponse>;
  signUploadParts(sessionId: string, body: SignPartsRequest, signal?: AbortSignal): Promise<SignPartsResponse>;
  completeUpload(sessionId: string, body: CompleteUploadRequest, signal?: AbortSignal): Promise<CloudNodeDto>;
  abortUpload(sessionId: string): Promise<void>;
  getDownloadUrl(nodeId: string): Promise<CloudDownloadResponse>;
}

export function cloudBasePath(scope: CloudScope): string {
  if (scope.type === 'USER') return '/api/v1/cloud/me';
  if (scope.type === 'WORKSPACE') {
    return `/api/v1/workspaces/${seg(scope.workspaceId)}/cloud`;
  }
  return `/api/v1/workspaces/${seg(scope.workspaceId)}/projects/${seg(scope.projectId)}/cloud`;
}

export function createHttpCloudFilesApi(scope: CloudScope): CloudFilesApi {
  const base = cloudBasePath(scope);

  return {
    listNodes(params = {}, signal) {
      return apiRequest<CursorPageResponse<CloudNodeDto>>('GET', `${base}/nodes`, {
        query: {
          parentId: params.parentId ?? undefined,
          view: params.view ?? 'ALL',
          q: params.q?.trim() || undefined,
          sortBy: params.sortBy ?? 'name',
          sortDir: params.sortDir ?? 'asc',
          cursor: params.cursor ?? undefined,
          limit: params.limit ?? 25,
        },
        signal,
      });
    },

    getBreadcrumbs(nodeId, signal) {
      return apiRequest<CloudBreadcrumbsResponse>('GET', `${base}/nodes/${seg(nodeId)}/breadcrumbs`, { signal });
    },

    getQuota(signal) {
      return apiRequest<CloudQuotaDto>('GET', `${base}/quota`, { signal });
    },

    createFolder(body) {
      return apiRequest<CloudNodeDto>('POST', `${base}/folders`, { body });
    },

    updateNode(nodeId, body) {
      return apiRequest<CloudNodeDto>('PATCH', `${base}/nodes/${seg(nodeId)}`, { body });
    },

    softDeleteNode(nodeId) {
      return apiRequest<CloudNodeDto>('DELETE', `${base}/nodes/${seg(nodeId)}`);
    },

    restoreNode(nodeId) {
      return apiRequest<CloudNodeDto>('POST', `${base}/nodes/${seg(nodeId)}/restore`);
    },

    permanentDeleteNode(nodeId) {
      return apiRequest<void>('DELETE', `${base}/nodes/${seg(nodeId)}/permanent`);
    },

    emptyTrash() {
      return apiRequest<EmptyTrashResponse>('DELETE', `${base}/trash`);
    },

    initUpload(body, signal) {
      return apiRequest<InitUploadResponse>('POST', `${base}/uploads/init`, { body, signal });
    },

    signUploadParts(sessionId, body, signal) {
      return apiRequest<SignPartsResponse>('POST', `${base}/uploads/${seg(sessionId)}/parts/sign`, {
        body,
        signal,
      });
    },

    completeUpload(sessionId, body, signal) {
      return apiRequest<CloudNodeDto>('POST', `${base}/uploads/${seg(sessionId)}/complete`, { body, signal });
    },

    abortUpload(sessionId) {
      return apiRequest<void>('POST', `${base}/uploads/${seg(sessionId)}/abort`);
    },

    getDownloadUrl(nodeId) {
      return apiRequest<CloudDownloadResponse>('GET', `${base}/nodes/${seg(nodeId)}/download`);
    },
  };
}
