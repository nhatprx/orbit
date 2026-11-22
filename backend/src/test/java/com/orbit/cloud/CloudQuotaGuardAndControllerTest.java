package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.cloud.config.CloudProperties;
import com.orbit.cloud.controller.CloudMoveController;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.MoveCloudNodesRequest;
import com.orbit.cloud.dto.MoveCloudNodesResponse;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudScopeType;
import com.orbit.cloud.entity.CloudStorageQuotaEntity;
import com.orbit.cloud.entity.CloudStorageQuotaId;
import com.orbit.cloud.repository.CloudStorageQuotaRepository;
import com.orbit.cloud.service.CloudAccessGuard;
import com.orbit.cloud.service.CloudMoveService;
import com.orbit.cloud.service.CloudQuotaService;
import com.orbit.cloud.service.CloudScope;
import com.orbit.common.ApiException;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.MethodParameter;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

class CloudQuotaGuardAndControllerTest {

    @Test
    @SuppressWarnings("unchecked")
    void quotaTransferMovesBytesAndThrows413WhenTargetFull() {
        CloudStorageQuotaRepository repo = mock(CloudStorageQuotaRepository.class);
        ObjectProvider<StringRedisTemplate> redis = mock(ObjectProvider.class);
        when(redis.getIfAvailable()).thenReturn(null);
        CloudQuotaService quota = new CloudQuotaService(repo, new CloudProperties(), redis);

        UUID uId = UUID.randomUUID();
        UUID wsId = UUID.randomUUID();
        CloudScope src = CloudScope.user(uId);
        CloudScope dst = CloudScope.workspace(wsId);

        CloudStorageQuotaEntity dstQuota = new CloudStorageQuotaEntity(CloudScopeType.WORKSPACE, wsId, 1000L);
        dstQuota.setUsedBytes(600L);
        when(repo.findById(new CloudStorageQuotaId(CloudScopeType.WORKSPACE, wsId))).thenReturn(Optional.of(dstQuota));
        when(repo.tryAddUsedBytes("WORKSPACE", wsId, 300L)).thenReturn(1);

        quota.transferUsedBytes(src, dst, 300L);
        verify(repo).tryAddUsedBytes("WORKSPACE", wsId, 300L);
        verify(repo).subtractUsedBytes("USER", uId, 300L);

        ApiException over = assertThrows(ApiException.class, () -> quota.transferUsedBytes(src, dst, 500L));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, over.getStatus());
        assertEquals("QUOTA_EXCEEDED", over.getCode());
        verify(repo, never()).subtractUsedBytes("USER", uId, 500L);
    }

    @Test
    void accessGuardAllowsSlidesModuleAndValidatesWriteScopeIds() {
        WorkspacePermissionEvaluator eval = mock(WorkspacePermissionEvaluator.class);
        WorkspaceModuleService wsModules = mock(WorkspaceModuleService.class);
        ProjectModuleRepository projModules = mock(ProjectModuleRepository.class);
        CloudAccessGuard guard = new CloudAccessGuard(eval, wsModules, projModules);

        UUID userId = UUID.randomUUID();
        UUID wsId = UUID.randomUUID();
        when(wsModules.enabledKeys(wsId)).thenReturn(Set.of("slides"));
        CloudScope resolved = guard.requireWriteScope(userId, CloudScopeType.WORKSPACE, wsId, null);
        assertEquals(CloudScope.workspace(wsId), resolved);

        when(wsModules.enabledKeys(wsId)).thenReturn(Set.of("git"));
        ApiException disabled = assertThrows(
            ApiException.class, () -> guard.requireWriteScope(userId, CloudScopeType.WORKSPACE, wsId, null)
        );
        assertEquals("MODULE_DISABLED", disabled.getCode());

        ApiException missingWs = assertThrows(
            ApiException.class, () -> guard.requireWriteScope(userId, CloudScopeType.WORKSPACE, null, null)
        );
        assertEquals("INVALID_SCOPE", missingWs.getCode());

        ApiException missingProj = assertThrows(
            ApiException.class, () -> guard.requireWriteScope(userId, CloudScopeType.PROJECT, wsId, null)
        );
        assertEquals("INVALID_SCOPE", missingProj.getCode());
    }

    @Test
    void moveControllerDeserializesContractAndReturnsMovedNodesWithFolderPath() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID nodeId = UUID.randomUUID();
        UUID wsId = UUID.randomUUID();
        CloudMoveService moveService = mock(CloudMoveService.class);
        CloudNodeResponse dto = new CloudNodeResponse(
            nodeId, CloudScopeType.WORKSPACE, wsId, null, CloudNodeType.FILE, "deck.pptx",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            1024L, false, 0, userId, "Alice", null, null, Instant.now(), Instant.now(), "/"
        );
        when(moveService.moveNodes(eq(userId), any(MoveCloudNodesRequest.class)))
            .thenReturn(new MoveCloudNodesResponse(List.of(dto)));

        MockMvc mvc = MockMvcBuilders.standaloneSetup(new CloudMoveController(moveService))
            .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                @Override
                public boolean supportsParameter(MethodParameter parameter) {
                    return parameter.getParameterType().equals(AuthenticatedUserPrincipal.class);
                }

                @Override
                public Object resolveArgument(
                    MethodParameter p, ModelAndViewContainer m, NativeWebRequest w, WebDataBinderFactory f
                ) {
                    return new AuthenticatedUserPrincipal(userId, "alice@orbit.dev", "Alice", UUID.randomUUID().toString());
                }
            })
            .build();

        String body = """
            {
              "nodeIds": ["%s"],
              "sourceScopeType": "USER",
              "targetScopeType": "WORKSPACE",
              "targetWorkspaceId": "%s",
              "targetParentId": null
            }
            """.formatted(nodeId, wsId);

        mvc.perform(post("/api/v1/cloud/nodes/move").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.moved[0].id").value(nodeId.toString()))
            .andExpect(jsonPath("$.moved[0].name").value("deck.pptx"))
            .andExpect(jsonPath("$.moved[0].folderPath").value("/"));
    }
}
