import { useEffect, useState } from 'react';
import { memberService } from '../../services/workspace/services';
import type { MemberDto } from '../../types/workspace.types';

/** Loads members in the active workspace/project scope for @mention autocomplete. */
export function useChatMentionMembers(workspaceId: string, projectId: string | null): MemberDto[] {
  const [members, setMembers] = useState<MemberDto[]>([]);

  useEffect(() => {
    let active = true;
    const load = projectId
      ? memberService.listProjectMembers(workspaceId, projectId, 0, 100)
      : memberService.listWorkspaceMembers(workspaceId, 0, 100);

    load
      .then((page) => {
        if (active) setMembers(page.items ?? []);
      })
      .catch(() => {
        if (active) setMembers([]);
      });

    return () => {
      active = false;
    };
  }, [workspaceId, projectId]);

  return members;
}
