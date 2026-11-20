/**
 * Composition root: the only place that chooses an implementation for each service interface.
 * UI code imports from here, so swapping a mock for an HTTP adapter never touches a component.
 */
import { httpInvitationService, httpMemberService, httpRoleService } from './httpAccess.service';
import { httpChatService } from './httpChat.service';
import { httpModuleService, httpProjectService, httpWorkspaceService } from './httpWorkspace.service';
import { mockLinkedAccountService } from './mockLinkedAccount.service';
import { mockMailService } from './mockMail.service';
import type {
  ChatService,
  LinkedAccountService,
  MailService,
} from './collab.service';
import type { InvitationService, MemberService, RoleService } from './access.service';
import type { ModuleService, ProjectService, WorkspaceService } from './workspace.service';

export const workspaceService: WorkspaceService = httpWorkspaceService;
export const projectService: ProjectService = httpProjectService;
export const moduleService: ModuleService = httpModuleService;
export const roleService: RoleService = httpRoleService;
export const memberService: MemberService = httpMemberService;
export const invitationService: InvitationService = httpInvitationService;
export const chatService: ChatService = httpChatService;

/** Mocked this round: Mails and social linking have no backend yet. */
export const mailService: MailService = mockMailService;
export const linkedAccountService: LinkedAccountService = mockLinkedAccountService;
