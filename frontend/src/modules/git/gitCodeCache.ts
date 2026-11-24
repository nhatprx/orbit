import { gitBasePath, type GitApi } from '../../services/git/gitApi';
import { apiRequest } from '../../services/workspace/httpClient';
import {
  gitScopeKey,
  type GitFileContentDto,
  type GitScope,
  type GitTreeEntryDto,
} from '../../types/git.types';

const MAX_CACHED_FILES = 200;

const fullTreeCache = new Map<string, GitTreeEntryDto[]>();
const inFlightTrees = new Map<string, Promise<GitTreeEntryDto[]>>();
const fileCache = new Map<string, GitFileContentDto>();
const inFlightFiles = new Map<string, Promise<GitFileContentDto>>();

function treeKey(scope: GitScope, branch: string): string {
  return `${gitScopeKey(scope)}::${branch}`;
}

function fileKey(scope: GitScope, branch: string, path: string): string {
  return `${gitScopeKey(scope)}::${branch}::${path}`;
}

export function getCachedFullTree(scope: GitScope, branch: string): GitTreeEntryDto[] | null {
  return fullTreeCache.get(treeKey(scope, branch)) ?? null;
}

export function fetchFullGitTree(
  scope: GitScope,
  branch: string,
  force = false,
): Promise<GitTreeEntryDto[]> {
  const key = treeKey(scope, branch);
  if (!force) {
    const cached = fullTreeCache.get(key);
    if (cached) return Promise.resolve(cached);
    const pending = inFlightTrees.get(key);
    if (pending) return pending;
  }
  const base = gitBasePath(scope);
  const promise = apiRequest<GitTreeEntryDto[]>('GET', `${base}/tree/full`, { query: { branch } })
    .then((entries) => {
      fullTreeCache.set(key, entries);
      inFlightTrees.delete(key);
      return entries;
    })
    .catch((err) => {
      inFlightTrees.delete(key);
      throw err;
    });
  inFlightTrees.set(key, promise);
  return promise;
}

export function getCachedGitFile(
  scope: GitScope,
  branch: string,
  path: string,
): GitFileContentDto | null {
  const key = fileKey(scope, branch, path);
  const hit = fileCache.get(key);
  if (!hit) return null;
  fileCache.delete(key);
  fileCache.set(key, hit);
  return hit;
}

export function setCachedGitFile(
  scope: GitScope,
  branch: string,
  file: GitFileContentDto,
): void {
  const key = fileKey(scope, branch, file.path);
  fileCache.delete(key);
  fileCache.set(key, file);
  if (fileCache.size > MAX_CACHED_FILES) {
    const oldest = fileCache.keys().next().value;
    if (oldest) fileCache.delete(oldest);
  }
}

export function loadGitFileCached(
  scope: GitScope,
  api: GitApi,
  branch: string,
  path: string,
): Promise<GitFileContentDto> {
  const cached = getCachedGitFile(scope, branch, path);
  if (cached) return Promise.resolve(cached);
  const key = fileKey(scope, branch, path);
  const pending = inFlightFiles.get(key);
  if (pending) return pending;
  const promise = api
    .getFile(branch, path)
    .then((file) => {
      setCachedGitFile(scope, branch, file);
      inFlightFiles.delete(key);
      return file;
    })
    .catch((err) => {
      inFlightFiles.delete(key);
      throw err;
    });
  inFlightFiles.set(key, promise);
  return promise;
}

export function prefetchGitFile(
  scope: GitScope,
  api: GitApi,
  branch: string,
  path: string,
): void {
  if (!branch || !path) return;
  if (getCachedGitFile(scope, branch, path)) return;
  const key = fileKey(scope, branch, path);
  if (inFlightFiles.has(key)) return;
  void loadGitFileCached(scope, api, branch, path).catch(() => {
    /* Silent background prefetch */
  });
}

export function invalidateGitCodeCache(scope: GitScope, branch?: string): void {
  const prefix = branch ? `${gitScopeKey(scope)}::${branch}` : `${gitScopeKey(scope)}::`;
  for (const k of fullTreeCache.keys()) {
    if (k.startsWith(prefix)) fullTreeCache.delete(k);
  }
  for (const k of fileCache.keys()) {
    if (k.startsWith(prefix)) fileCache.delete(k);
  }
}
