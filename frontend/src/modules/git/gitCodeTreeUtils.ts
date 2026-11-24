import type { GitTreeEntryDto } from '../../types/git.types';

export interface CodeTreeNode {
  entry: GitTreeEntryDto;
  children: CodeTreeNode[];
}

export interface FlatTreeRow {
  entry: GitTreeEntryDto;
  depth: number;
  isExpanded: boolean;
}

function sortNodes(nodes: CodeTreeNode[]): CodeTreeNode[] {
  nodes.sort((a, b) => {
    if (a.entry.type !== b.entry.type) {
      return a.entry.type === 'dir' ? -1 : 1;
    }
    return a.entry.name.localeCompare(b.entry.name, undefined, { sensitivity: 'base' });
  });
  for (const node of nodes) {
    if (node.children.length > 0) sortNodes(node.children);
  }
  return nodes;
}

/** Builds a nested IDE folder tree from a flat recursive list of GitTreeEntryDto items. */
export function buildCodeTree(entries: GitTreeEntryDto[]): CodeTreeNode[] {
  const nodeMap = new Map<string, CodeTreeNode>();
  const roots: CodeTreeNode[] = [];

  for (const entry of entries) {
    const existing = nodeMap.get(entry.path);
    if (existing) {
      existing.entry = entry;
    } else {
      nodeMap.set(entry.path, { entry, children: [] });
    }
  }

  for (const entry of entries) {
    const node = nodeMap.get(entry.path)!;
    const slash = entry.path.lastIndexOf('/');
    if (slash === -1) {
      roots.push(node);
      continue;
    }
    const parentPath = entry.path.slice(0, slash);
    let parent = nodeMap.get(parentPath);
    if (!parent) {
      const parentSlash = parentPath.lastIndexOf('/');
      const parentName = parentSlash >= 0 ? parentPath.slice(parentSlash + 1) : parentPath;
      parent = {
        entry: { path: parentPath, name: parentName, type: 'dir', size: 0, sha: '', htmlUrl: null },
        children: [],
      };
      nodeMap.set(parentPath, parent);
      if (parentSlash === -1) roots.push(parent);
    }
    parent.children.push(node);
  }

  return sortNodes(roots);
}

/** Flattens visible rows according to expandedDirs and optional instant search query. */
export function flattenVisibleTree(
  roots: CodeTreeNode[],
  expandedDirs: Set<string>,
  query: string,
): FlatTreeRow[] {
  const cleanQuery = query.trim().toLowerCase();
  const rows: FlatTreeRow[] = [];

  if (cleanQuery) {
    const walkFilter = (nodes: CodeTreeNode[]) => {
      for (const node of nodes) {
        if (
          node.entry.type === 'file' &&
          (node.entry.name.toLowerCase().includes(cleanQuery) ||
            node.entry.path.toLowerCase().includes(cleanQuery))
        ) {
          rows.push({ entry: node.entry, depth: 0, isExpanded: false });
        }
        if (node.children.length > 0) walkFilter(node.children);
      }
    };
    walkFilter(roots);
    return rows.slice(0, 200);
  }

  const walkVisible = (nodes: CodeTreeNode[], depth: number) => {
    for (const node of nodes) {
      const isExpanded = node.entry.type === 'dir' && expandedDirs.has(node.entry.path);
      rows.push({ entry: node.entry, depth, isExpanded });
      if (isExpanded && node.children.length > 0) {
        walkVisible(node.children, depth + 1);
      }
    }
  };
  walkVisible(roots, 0);
  return rows;
}
