import { useEffect, useState } from 'react';
import { memberService } from '../../services/workspace/services';
import type { MemberDto } from '../../types/workspace.types';

/** Loads assignable project and workspace members without failing if member APIs are unavailable. */
export function useProjectMembers(
  workspaceId: string,
  projectId: string,
  canViewWorkspaceMembers: boolean
): MemberDto[] {
  const [members, setMembers] = useState<MemberDto[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const [projectPage, workspacePage] = await Promise.all([
        memberService.listProjectMembers(workspaceId, projectId, 0, 100).catch(() => null),
        canViewWorkspaceMembers
          ? memberService.listWorkspaceMembers(workspaceId, 0, 100).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (!active) return;

      const byUserId = new Map<string, MemberDto>();
      for (const item of projectPage?.items ?? []) {
        byUserId.set(item.userId, item);
      }
      for (const item of workspacePage?.items ?? []) {
        if (!byUserId.has(item.userId)) {
          byUserId.set(item.userId, item);
        }
      }
      setMembers(Array.from(byUserId.values()));
    }

    void load();
    return () => {
      active = false;
    };
  }, [workspaceId, projectId, canViewWorkspaceMembers]);

  return members;
}
