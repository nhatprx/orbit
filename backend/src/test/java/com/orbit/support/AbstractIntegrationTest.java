package com.orbit.support;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.project.entity.ProjectMemberEntity;
import com.orbit.project.repository.ProjectMemberRepository;
import com.orbit.project.repository.ProjectRoleRepository;
import com.orbit.workspace.entity.WorkspaceMemberEntity;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import com.orbit.workspace.repository.WorkspaceRoleRepository;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Boots the full application against a throw-away PostgreSQL container (real Flyway
 * migrations, real JPA mappings). One container is shared by every subclass in the JVM.
 */
@SpringBootTest(properties = {
    "orbit.workspace.purge.enabled=false",
    "orbit.cloud.sweeper.enabled=false",
    "orbit.chat.redis.enabled=false",
    "orbit.cors.allowed-origins=http://localhost:5173"
})
@AutoConfigureMockMvc
public abstract class AbstractIntegrationTest {

    private static PostgreSQLContainer<?> postgres;

    @Autowired
    protected UserRepository userRepository;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        synchronized (AbstractIntegrationTest.class) {
            if (postgres == null) {
                postgres = new PostgreSQLContainer<>("postgres:16-alpine");
                postgres.start();
            }
        }
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    protected WorkspaceMemberRepository workspaceMembers;

    @Autowired
    protected WorkspaceRoleRepository workspaceRoles;

    @Autowired
    protected ProjectMemberRepository projectMembers;

    @Autowired
    protected ProjectRoleRepository projectRoles;

    /** Adds a user straight to a Workspace with a seeded system role (name: Owner, Admin, Member). */
    protected void addWorkspaceMember(UUID workspaceId, UserEntity user, String roleName) {
        UUID roleId = workspaceRoles.findByWorkspaceIdAndNameIgnoreCase(workspaceId, roleName).orElseThrow().getId();
        workspaceMembers.save(new WorkspaceMemberEntity(workspaceId, user.getId(), roleId));
    }

    protected void addProjectMember(UUID projectId, UserEntity user, String roleName) {
        UUID roleId = projectRoles.findByProjectIdAndNameIgnoreCase(projectId, roleName).orElseThrow().getId();
        projectMembers.save(new ProjectMemberEntity(projectId, user.getId(), roleId));
    }

    protected UserEntity newUser(String prefix) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserEntity user = new UserEntity();
        user.setUsername(prefix + "_" + suffix);
        user.setEmail(prefix + "." + suffix + "@orbit.test");
        user.setDisplayName(prefix + " " + suffix);
        user.setPasswordHash("{noop}unused");
        return userRepository.save(user);
    }

    /** A user with the platform admin role (role values are stored lowercase). */
    protected UserEntity newAdmin(String prefix) {
        UserEntity admin = newUser(prefix);
        admin.setRole("admin");
        return userRepository.save(admin);
    }

    /** Authenticates as the user, with the token claiming the role stored on the entity. */
    protected static RequestPostProcessor as(UserEntity user) {
        return asClaiming(user, user.getRole());
    }

    /** Authenticates as the user while the token claims a different role than the database holds. */
    protected static RequestPostProcessor asClaiming(UserEntity user, String claimedRole) {
        AuthenticatedUserPrincipal principal =
            new AuthenticatedUserPrincipal(user.getId(), "test-jti", claimedRole, "none");
        return SecurityMockMvcRequestPostProcessors.authentication(
            new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + claimedRole.toUpperCase(Locale.ROOT)))
            )
        );
    }
}
