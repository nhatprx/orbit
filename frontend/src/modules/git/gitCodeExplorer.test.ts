import { describe, expect, it, vi } from 'vitest';
import type { GitTreeEntryDto } from '../../types/git.types';
import {
  getCachedGitFile,
  invalidateGitCodeCache,
  loadGitFileCached,
} from './gitCodeCache';
import { buildCodeTree, flattenVisibleTree } from './gitCodeTreeUtils';
import { parseEnvContent } from './GitEnvPreview';
import { resolveFileIconName, resolveFolderIconName } from './gitMaterialIconMap';
import { createMockGitApi, FULL_SCOPE } from './gitTestFixtures';

describe('Material Icon Theme resolver', () => {
  it('maps well-known folders and files to official Material Icon Theme SVGs', () => {
    expect(resolveFolderIconName('src', false)).toBe('folder-src');
    expect(resolveFolderIconName('src', true)).toBe('folder-src-open');
    expect(resolveFolderIconName('components', false)).toBe('folder-components');
    expect(resolveFolderIconName('unknown-dir', false)).toBe('folder-base');
    expect(resolveFolderIconName('unknown-dir', true)).toBe('folder-base-open');

    expect(resolveFileIconName('App.tsx')).toBe('react_ts');
    expect(resolveFileIconName('index.ts')).toBe('typescript');
    expect(resolveFileIconName('GitContentService.java')).toBe('java');
    expect(resolveFileIconName('Dockerfile')).toBe('docker');
    expect(resolveFileIconName('docker-compose.local.yml')).toBe('docker');
    expect(resolveFileIconName('package.json')).toBe('nodejs');
    expect(resolveFileIconName('.env.local')).toBe('tune');
    expect(resolveFileIconName('GitPage.test.tsx')).toBe('test-jsx');
    expect(resolveFileIconName('unknown.xyz')).toBe('file');
  });
});

describe('IDE recursive tree builder and filter', () => {
  const entries: GitTreeEntryDto[] = [
    { path: 'README.md', name: 'README.md', type: 'file', size: 120, sha: 'a1', htmlUrl: null },
    { path: 'src', name: 'src', type: 'dir', size: 0, sha: 'd1', htmlUrl: null },
    { path: 'src/components', name: 'components', type: 'dir', size: 0, sha: 'd2', htmlUrl: null },
    { path: 'src/components/Button.tsx', name: 'Button.tsx', type: 'file', size: 500, sha: 'f1', htmlUrl: null },
    { path: 'src/app.ts', name: 'app.ts', type: 'file', size: 80, sha: 'f2', htmlUrl: null },
  ];

  it('sorts directories before files and expands nested children on demand', () => {
    const roots = buildCodeTree(entries);
    expect(roots.map((n) => n.entry.name)).toEqual(['src', 'README.md']);

    const collapsed = flattenVisibleTree(roots, new Set(), '');
    expect(collapsed.map((r) => r.entry.path)).toEqual(['src', 'README.md']);

    const expanded = flattenVisibleTree(roots, new Set(['src', 'src/components']), '');
    expect(expanded.map((r) => `${r.depth}:${r.entry.path}`)).toEqual([
      '0:src',
      '1:src/components',
      '2:src/components/Button.tsx',
      '1:src/app.ts',
      '0:README.md',
    ]);
  });

  it('filters across all nested files instantaneously by path or name', () => {
    const roots = buildCodeTree(entries);
    const filtered = flattenVisibleTree(roots, new Set(), 'button');
    expect(filtered.map((r) => r.entry.path)).toEqual(['src/components/Button.tsx']);
  });
});

describe('gitCodeCache deduplication and invalidation', () => {
  it('deduplicates concurrent fetches and serves subsequent reads from memory', async () => {
    invalidateGitCodeCache(FULL_SCOPE);
    const api = createMockGitApi(null);
    const spy = vi.spyOn(api, 'getFile');

    const [a, b] = await Promise.all([
      loadGitFileCached(FULL_SCOPE, api, 'main', 'src/app.ts'),
      loadGitFileCached(FULL_SCOPE, api, 'main', 'src/app.ts'),
    ]);

    expect(a.path).toBe('src/app.ts');
    expect(b.path).toBe('src/app.ts');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(getCachedGitFile(FULL_SCOPE, 'main', 'src/app.ts')?.path).toBe('src/app.ts');

    invalidateGitCodeCache(FULL_SCOPE, 'main');
    expect(getCachedGitFile(FULL_SCOPE, 'main', 'src/app.ts')).toBeNull();
  });
});

describe('parseEnvContent', () => {
  it('parses comments, quoted values, and marks secret keys as sensitive', () => {
    const rows = parseEnvContent('# Database\nAPP_ENV="production"\nexport JWT_SECRET=supersecret\nPORT=8080\n');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ kind: 'comment', comment: 'Database' });
    expect(rows[1]).toMatchObject({ kind: 'entry', key: 'APP_ENV', value: 'production', sensitive: false });
    expect(rows[2]).toMatchObject({ kind: 'entry', key: 'JWT_SECRET', value: 'supersecret', sensitive: true });
    expect(rows[3]).toMatchObject({ kind: 'entry', key: 'PORT', value: '8080', sensitive: false });
  });
});
