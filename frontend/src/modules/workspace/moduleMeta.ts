import {
  Cloud,
  FileSpreadsheet,
  FileText,
  GitBranch,
  ListTodo,
  MessageSquare,
  Presentation,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleKey } from '../../types/workspace.types';

/** Display metadata for the module catalog (git, docs, sheets, slides, chat, cloud, issues). */
export const MODULE_META: Record<ModuleKey, { label: string; summary: string; icon: LucideIcon }> = {
  git: { label: 'Git', summary: 'Repositories, commits, and pull requests', icon: GitBranch },
  docs: { label: 'Docs', summary: 'Collaborative documents', icon: FileText },
  sheets: { label: 'Sheets', summary: 'Structured spreadsheets', icon: FileSpreadsheet },
  slides: { label: 'Slides', summary: 'Presentation decks', icon: Presentation },
  chat: { label: 'Chat', summary: 'Real-time workspace and project messaging', icon: MessageSquare },
  cloud: { label: 'Cloud Files', summary: 'Structured cloud storage, folders, and file sharing', icon: Cloud },
  issues: { label: 'Issues & Sprints', summary: 'Agile issue tracking, epics, sprints, and lifecycle boards', icon: ListTodo },
};

export const MODULE_ORDER: ModuleKey[] = ['git', 'docs', 'sheets', 'slides', 'chat', 'cloud', 'issues'];

export function isModuleKey(value: string): value is ModuleKey {
  return value in MODULE_META;
}

/** Narrows server strings to known module keys, preserving catalog order. */
export function orderModules(keys: readonly string[]): ModuleKey[] {
  return MODULE_ORDER.filter((key) => keys.includes(key));
}
