import type { WorkspaceAreaId } from '../../types/dashboard.types';

const AREA_LABEL: Record<WorkspaceAreaId, string> = {
  overview: 'Overview',
  ai: 'AI Chat',
  profile: 'Profile',
  'workspace-settings': 'Workspace Settings',
  'project-settings': 'Project Settings',
  git: 'Git',
  docs: 'Docs',
  sheets: 'Sheets',
  chat: 'Chat',
  mail: 'Mails',
  cloud: 'Cloud Files',
  'personal-cloud': 'Personal Cloud',
  admin: 'Admin Console',
};

/** Areas that live outside any Workspace or Project scope. */
const GLOBAL_AREAS: WorkspaceAreaId[] = ['mail', 'ai', 'profile', 'admin', 'personal-cloud'];

/** Workspace-level pages never show a project, even while one is selected in the sidebar. */
const WORKSPACE_LEVEL_AREAS: WorkspaceAreaId[] = ['overview', 'workspace-settings'];

interface HeaderBreadcrumbProps {
  active: WorkspaceAreaId;
  workspaceName: string | null;
  projectName: string | null;
}

export function HeaderBreadcrumb({ active, workspaceName, projectName }: HeaderBreadcrumbProps) {
  const global = GLOBAL_AREAS.includes(active);
  const showProject = !global && !WORKSPACE_LEVEL_AREAS.includes(active) && projectName;
  return (
    <>
      {!global && workspaceName && (
        <>
          <span className="hidden font-mono text-xs text-[#7D8590] sm:inline">/</span>
          <span className="hidden max-w-40 truncate text-[13px] text-[#8B949E] sm:inline">{workspaceName}</span>
        </>
      )}
      {showProject && (
        <>
          <span className="hidden font-mono text-xs text-[#7D8590] md:inline">/</span>
          <span className="hidden max-w-40 truncate text-[13px] text-[#8B949E] md:inline">{projectName}</span>
        </>
      )}
      <span className="font-mono text-xs text-[#7D8590]">/</span>
      <span className="text-[13px] font-medium text-[#E6EDF3]">{AREA_LABEL[active]}</span>
    </>
  );
}
