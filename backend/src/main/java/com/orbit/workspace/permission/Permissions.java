package com.orbit.workspace.permission;

import java.util.List;
import java.util.Set;

/** Authoritative permission keys. Authorization is always evaluated by key, never by role name. */
public final class Permissions {

    public static final String WORKSPACE_VIEW = "workspace.view";
    public static final String WORKSPACE_EDIT = "workspace.edit";
    public static final String WORKSPACE_DELETE = "workspace.delete";
    public static final String WORKSPACE_TRANSFER_OWNER = "workspace.transfer_owner";
    public static final String MEMBER_VIEW = "member.view";
    public static final String MEMBER_INVITE = "member.invite";
    public static final String MEMBER_REMOVE = "member.remove";
    public static final String MEMBER_ASSIGN_ROLE = "member.assign_role";
    public static final String ROLE_VIEW = "role.view";
    public static final String ROLE_CREATE = "role.create";
    public static final String ROLE_EDIT = "role.edit";
    public static final String ROLE_DELETE = "role.delete";
    public static final String MODULE_ENABLE = "module.enable";
    public static final String MODULE_DISABLE = "module.disable";
    public static final String INTEGRATION_MANAGE = "integration.manage";
    public static final String PROJECT_CREATE = "project.create";
    public static final String PROJECT_VIEW_ALL = "project.view_all";
    public static final String CHAT_READ = "chat.read";
    public static final String CHAT_WRITE = "chat.write";
    public static final String CHAT_MANAGE = "chat.manage";
    public static final String FILES_READ = "files.read";
    public static final String FILES_WRITE = "files.write";
    public static final String FILES_DELETE = "files.delete";
    public static final String FILES_MANAGE = "files.manage";
    public static final String GIT_READ = "git.read";
    public static final String GIT_WRITE = "git.write";
    public static final String GIT_DELETE = "git.delete";
    public static final String GIT_MANAGE = "git.manage";
    public static final String ISSUES_READ = "issues.read";
    public static final String ISSUES_WRITE = "issues.write";
    public static final String ISSUES_DELETE = "issues.delete";
    public static final String ISSUES_MANAGE = "issues.manage";
    public static final String WHITEBOARD_READ = "whiteboard.read";
    public static final String WHITEBOARD_WRITE = "whiteboard.write";
    public static final String WHITEBOARD_DELETE = "whiteboard.delete";
    public static final String WHITEBOARD_MANAGE = "whiteboard.manage";

    public static final String PROJECT_VIEW = "project.view";
    public static final String PROJECT_EDIT = "project.edit";
    public static final String PROJECT_DELETE = "project.delete";
    public static final String PMEMBER_INVITE = "pmember.invite";
    public static final String PMEMBER_REMOVE = "pmember.remove";
    public static final String PMEMBER_ASSIGN_ROLE = "pmember.assign_role";
    public static final String PROLE_CREATE = "prole.create";
    public static final String PROLE_EDIT = "prole.edit";
    public static final String PROLE_DELETE = "prole.delete";
    public static final String PMODULE_SELECT = "pmodule.select";
    public static final String PCHAT_READ = "pchat.read";
    public static final String PCHAT_WRITE = "pchat.write";
    public static final String PCHAT_MANAGE = "pchat.manage";
    public static final String PFILES_READ = "pfiles.read";
    public static final String PFILES_WRITE = "pfiles.write";
    public static final String PFILES_DELETE = "pfiles.delete";
    public static final String PFILES_MANAGE = "pfiles.manage";
    public static final String PGIT_READ = "pgit.read";
    public static final String PGIT_WRITE = "pgit.write";
    public static final String PGIT_DELETE = "pgit.delete";
    public static final String PGIT_MANAGE = "pgit.manage";
    public static final String PISSUES_READ = "pissues.read";
    public static final String PISSUES_WRITE = "pissues.write";
    public static final String PISSUES_DELETE = "pissues.delete";
    public static final String PISSUES_MANAGE = "pissues.manage";
    public static final String PWHITEBOARD_READ = "pwhiteboard.read";
    public static final String PWHITEBOARD_WRITE = "pwhiteboard.write";
    public static final String PWHITEBOARD_DELETE = "pwhiteboard.delete";
    public static final String PWHITEBOARD_MANAGE = "pwhiteboard.manage";

    public static final List<String> WORKSPACE_KEYS = List.of(
        WORKSPACE_VIEW, WORKSPACE_EDIT, WORKSPACE_DELETE, WORKSPACE_TRANSFER_OWNER,
        MEMBER_VIEW, MEMBER_INVITE, MEMBER_REMOVE, MEMBER_ASSIGN_ROLE,
        ROLE_VIEW, ROLE_CREATE, ROLE_EDIT, ROLE_DELETE,
        MODULE_ENABLE, MODULE_DISABLE, INTEGRATION_MANAGE,
        PROJECT_CREATE, PROJECT_VIEW_ALL,
        CHAT_READ, CHAT_WRITE, CHAT_MANAGE,
        FILES_READ, FILES_WRITE, FILES_DELETE, FILES_MANAGE,
        GIT_READ, GIT_WRITE, GIT_DELETE, GIT_MANAGE,
        ISSUES_READ, ISSUES_WRITE, ISSUES_DELETE, ISSUES_MANAGE,
        WHITEBOARD_READ, WHITEBOARD_WRITE, WHITEBOARD_DELETE, WHITEBOARD_MANAGE
    );

    public static final List<String> PROJECT_KEYS = List.of(
        PROJECT_VIEW, PROJECT_EDIT, PROJECT_DELETE,
        PMEMBER_INVITE, PMEMBER_REMOVE, PMEMBER_ASSIGN_ROLE,
        PROLE_CREATE, PROLE_EDIT, PROLE_DELETE,
        PMODULE_SELECT,
        PCHAT_READ, PCHAT_WRITE, PCHAT_MANAGE,
        PFILES_READ, PFILES_WRITE, PFILES_DELETE, PFILES_MANAGE,
        PGIT_READ, PGIT_WRITE, PGIT_DELETE, PGIT_MANAGE,
        PISSUES_READ, PISSUES_WRITE, PISSUES_DELETE, PISSUES_MANAGE,
        PWHITEBOARD_READ, PWHITEBOARD_WRITE, PWHITEBOARD_DELETE, PWHITEBOARD_MANAGE
    );

    private static final Set<String> WORKSPACE_KEY_SET = Set.copyOf(WORKSPACE_KEYS);
    private static final Set<String> PROJECT_KEY_SET = Set.copyOf(PROJECT_KEYS);

    private Permissions() {}

    public static boolean isWorkspaceKey(String key) {
        return key != null && WORKSPACE_KEY_SET.contains(key);
    }

    public static boolean isProjectKey(String key) {
        return key != null && PROJECT_KEY_SET.contains(key);
    }
}
