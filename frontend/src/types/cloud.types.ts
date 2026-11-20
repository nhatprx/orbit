export type CloudScopeType = 'USER' | 'WORKSPACE' | 'PROJECT';

export type CloudScope =
  | { type: 'USER' }
  | { type: 'WORKSPACE'; workspaceId: string; permissions: string[] }
  | { type: 'PROJECT'; workspaceId: string; projectId: string; permissions: string[] };

export type CloudNodeType = 'FOLDER' | 'FILE';
export type CloudView = 'ALL' | 'STARRED' | 'TRASH';
export type CloudSortBy = 'name' | 'size' | 'updatedAt';
export type CloudSortDir = 'asc' | 'desc';

export interface CloudNodeDto {
  id: string;
  scopeType: CloudScopeType;
  scopeId: string;
  parentId: string | null;
  nodeType: CloudNodeType;
  name: string;
  mimeType: string | null;
  sizeBytes: number;
  starred: boolean;
  depth: number;
  createdBy: string;
  createdByName: string;
  deletedAt: string | null;
  purgeAfter: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CloudBreadcrumbItem {
  id: string;
  name: string;
}

export interface CloudBreadcrumbsResponse {
  items: CloudBreadcrumbItem[];
}

export interface CloudQuotaDto {
  scopeType: CloudScopeType;
  scopeId: string;
  usedBytes: number;
  quotaBytes: number;
  reservedBytes: number;
  maxFileSizeBytes: number;
  multipartThresholdBytes: number;
}

export interface ListCloudNodesParams {
  parentId?: string | null;
  view?: CloudView;
  q?: string;
  sortBy?: CloudSortBy;
  sortDir?: CloudSortDir;
  cursor?: string | null;
  limit?: number;
}

export interface CreateFolderRequest {
  parentId?: string | null;
  name: string;
}

export interface UpdateCloudNodeRequest {
  name?: string;
  parentId?: string | null;
  moveToRoot?: boolean;
  starred?: boolean;
}

export interface EmptyTrashResponse {
  deletedCount: number;
  freedBytes: number;
}

export interface InitUploadRequest {
  parentId?: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface InitUploadResponse {
  sessionId: string;
  nodeId: string;
  strategy: 'SINGLE' | 'MULTIPART';
  uploadUrl: string | null;
  uploadHeaders: Record<string, string>;
  partSizeBytes: number;
  totalParts: number;
  expiresAt: string;
}

export interface SignPartsRequest {
  partNumbers: number[];
}

export interface SignedPartUrl {
  partNumber: number;
  uploadUrl: string;
}

export interface SignPartsResponse {
  parts: SignedPartUrl[];
  expiresAt: string;
}

export interface CompletedPart {
  partNumber: number;
  etag: string;
}

export interface CompleteUploadRequest {
  parts?: CompletedPart[];
  checksumSha256?: string;
}

export interface CloudDownloadResponse {
  url: string;
  expiresAt: string;
  provider: 'CLOUDFRONT' | 'S3';
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export type UploadTaskStatus = 'queued' | 'uploading' | 'completing' | 'done' | 'error' | 'cancelled';

export interface UploadTaskItem {
  localId: string;
  fileName: string;
  sizeBytes: number;
  uploadedBytes: number;
  progress: number;
  status: UploadTaskStatus;
  error: string | null;
  sessionId: string | null;
}

export interface CloudPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManage: boolean;
}

export function resolveCloudPermissions(scope: CloudScope): CloudPermissions {
  if (scope.type === 'USER') {
    return { canRead: true, canWrite: true, canDelete: true, canManage: true };
  }
  const prefix = scope.type === 'WORKSPACE' ? 'files' : 'pfiles';
  const has = (action: string) => scope.permissions.includes(`${prefix}.${action}`);
  return {
    canRead: has('read'),
    canWrite: has('write'),
    canDelete: has('delete'),
    canManage: has('manage'),
  };
}

export function cloudScopeKey(scope: CloudScope): string {
  if (scope.type === 'USER') return 'USER';
  if (scope.type === 'WORKSPACE') return `WORKSPACE:${scope.workspaceId}`;
  return `PROJECT:${scope.workspaceId}:${scope.projectId}`;
}
