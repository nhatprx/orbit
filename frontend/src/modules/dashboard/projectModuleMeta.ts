import {
  FileSpreadsheet,
  FileText,
  GitBranch,
  HardDrive,
  Mail,
  MessageSquare,
  Presentation,
  Terminal,
} from 'lucide-react';
import type { ProjectModuleId } from '../../types/workspace.types';

export const PROJECT_MODULE_META: Record<
  ProjectModuleId,
  { label: string; icon: typeof GitBranch }
> = {
  git: { label: 'Git', icon: GitBranch },
  mail: { label: 'Mail', icon: Mail },
  cloud: { label: 'Cloud Files', icon: HardDrive },
  chat: { label: 'Community Chat', icon: MessageSquare },
  docs: { label: 'Docs', icon: FileText },
  sheets: { label: 'Sheets', icon: FileSpreadsheet },
  ppt: { label: 'Slides', icon: Presentation },
  markdown: { label: 'Markdown', icon: Terminal },
};
