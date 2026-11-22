package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.UpdateCloudNodeRequest;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudScopeType;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.repository.CloudNodeQueryRepository;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.cloud.service.CloudNameValidator;
import com.orbit.cloud.service.CloudNodeMapper;
import com.orbit.cloud.service.CloudNodeService;
import com.orbit.cloud.service.CloudScope;
import com.orbit.common.ApiException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;

class CloudRenameAndViewTest {

    @Test
    void renameLocksFileExtensionAndAllowsFoldersAndExtensionlessFiles() {
        assertEquals("quarterly-report.docx", CloudNameValidator.validateRename("demo.docx", CloudNodeType.FILE, "quarterly-report"));
        assertEquals("Report.docx", CloudNameValidator.validateRename("demo.docx", CloudNodeType.FILE, "Report.DOCX"));
        assertEquals("Report.docx", CloudNameValidator.validateRename("demo.docx", CloudNodeType.FILE, "  Report.docx  "));
        assertEquals("README.md", CloudNameValidator.validateRename("README", CloudNodeType.FILE, "README.md"));
        assertEquals(".env.local", CloudNameValidator.validateRename(".env", CloudNodeType.FILE, ".env.local"));
        assertEquals("Folder.v2", CloudNameValidator.validateRename("Folder.v1", CloudNodeType.FOLDER, "Folder.v2"));

        ApiException changed = assertThrows(
            ApiException.class,
            () -> CloudNameValidator.validateRename("demo.docx", CloudNodeType.FILE, "demo.xlsx")
        );
        assertEquals(HttpStatus.BAD_REQUEST, changed.getStatus());
        assertEquals("EXTENSION_CHANGE_FORBIDDEN", changed.getCode());
        assertTrue(changed.getMessage().contains(".docx"));

        ApiException emptyBase = assertThrows(
            ApiException.class,
            () -> CloudNameValidator.validateRename("demo.docx", CloudNodeType.FILE, ".docx")
        );
        assertEquals("INVALID_NAME", emptyBase.getCode());

        String longBase = "a".repeat(252);
        assertThrows(ApiException.class, () -> CloudNameValidator.validateRename("demo.docx", CloudNodeType.FILE, longBase));
    }

    @Test
    void updateNodeEnforcesExtensionLockOnFiles() {
        CloudNodeRepository nodeRepo = mock(CloudNodeRepository.class);
        CloudNodeQueryRepository queryRepo = mock(CloudNodeQueryRepository.class);
        CloudNodeMapper mapper = mock(CloudNodeMapper.class);
        CloudNodeService service = new CloudNodeService(nodeRepo, queryRepo, mapper);

        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        CloudNodeEntity file = fileNode(scope, userId, "demo.docx", null);
        when(nodeRepo.findByIdAndScopeTypeAndScopeId(file.getId(), CloudScopeType.USER, userId)).thenReturn(Optional.of(file));
        when(nodeRepo.saveAndFlush(any(CloudNodeEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mapper.toResponse(any(CloudNodeEntity.class))).thenReturn(mock(CloudNodeResponse.class));

        service.updateNode(scope, userId, file.getId(), new UpdateCloudNodeRequest("quarterly-report", null, null, null));
        assertEquals("quarterly-report.docx", file.getName());
        assertEquals("quarterly-report.docx", file.getNameNormalized());

        ApiException ex = assertThrows(
            ApiException.class,
            () -> service.updateNode(scope, userId, file.getId(), new UpdateCloudNodeRequest("budget.xlsx", null, null, null))
        );
        assertEquals("EXTENSION_CHANGE_FORBIDDEN", ex.getCode());
    }

    @Test
    void listNodesAppliesRecentsDefaultSortAndAllowsExplicitOverride() {
        CloudNodeRepository nodeRepo = mock(CloudNodeRepository.class);
        CloudNodeQueryRepository queryRepo = mock(CloudNodeQueryRepository.class);
        CloudNodeMapper mapper = mock(CloudNodeMapper.class);
        CloudNodeService service = new CloudNodeService(nodeRepo, queryRepo, mapper);
        CloudScope scope = CloudScope.user(UUID.randomUUID());

        when(queryRepo.findPage(any(), any(), anyString(), any(), anyString(), any(Boolean.class), any(), anyInt()))
            .thenReturn(List.of());
        when(mapper.toResponses(any())).thenReturn(List.of());

        service.listNodes(scope, null, "RECENTS", null, null, null, null, 20);
        verify(queryRepo).findPage(scope, null, "RECENTS", null, "updatedAt", false, null, 21);

        service.listNodes(scope, null, "RECENTS", null, "name", "asc", null, 20);
        verify(queryRepo).findPage(scope, null, "RECENTS", null, "name", true, null, 21);

        service.listNodes(scope, null, "DOCS", null, null, null, null, 20);
        verify(queryRepo).findPage(scope, null, "DOCS", null, "name", true, null, 21);
    }

    @Test
    @SuppressWarnings("unchecked")
    void queryRepositoryBuildsRecursiveFiltersForRecentsDocsSheetsAndSlides() {
        EntityManager em = mock(EntityManager.class);
        TypedQuery<CloudNodeEntity> typedQuery = mock(TypedQuery.class);
        ObjectProvider<EntityManager> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(em);
        when(em.createQuery(anyString(), eq(CloudNodeEntity.class))).thenReturn(typedQuery);
        when(typedQuery.setParameter(anyString(), any())).thenReturn(typedQuery);
        when(typedQuery.setMaxResults(anyInt())).thenReturn(typedQuery);
        when(typedQuery.getResultList()).thenReturn(List.of());

        CloudNodeQueryRepository repo = new CloudNodeQueryRepository(provider);
        CloudScope scope = CloudScope.user(UUID.randomUUID());
        UUID ignoredParent = UUID.randomUUID();

        repo.findPage(scope, ignoredParent, "RECENTS", null, "updatedAt", false, null, 20);
        repo.findPage(scope, ignoredParent, "DOCS", null, "name", true, null, 20);
        repo.findPage(scope, ignoredParent, "SHEETS", null, "name", true, null, 20);
        repo.findPage(scope, ignoredParent, "SLIDES", null, "name", true, null, 20);

        ArgumentCaptor<String> jpqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(em, times(4)).createQuery(jpqlCaptor.capture(), eq(CloudNodeEntity.class));
        List<String> sqls = jpqlCaptor.getAllValues();

        assertTrue(sqls.get(0).contains("n.nodeType = :fileType") && !sqls.get(0).contains(":parentId"));
        assertTrue(sqls.get(1).contains("%.docx") && sqls.get(1).contains("%.md") && sqls.get(1).contains("%.txt") && sqls.get(1).contains("%.pdf"));
        assertTrue(sqls.get(2).contains("%.xlsx") && sqls.get(2).contains("%.csv"));
        assertTrue(sqls.get(3).contains("%.pptx") && !sqls.get(3).contains(":parentId"));
    }

    @Test
    void mapperResolvesFolderPathsInSingleBatchQuery() {
        UserRepository userRepo = mock(UserRepository.class);
        CloudNodeRepository nodeRepo = mock(CloudNodeRepository.class);
        CloudNodeMapper mapper = new CloudNodeMapper(userRepo, nodeRepo);

        UUID userId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setDisplayName("Alice");
        when(userRepo.findAllById(Set.of(userId))).thenReturn(List.of(user));

        UUID q4Id = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        CloudNodeEntity rootFile = fileNode(scope, userId, "root.docx", null);
        CloudNodeEntity nestedFile = fileNode(scope, userId, "plan.xlsx", q4Id);

        when(nodeRepo.findAncestorPathRows(Set.of(q4Id))).thenReturn(List.of(
            new Object[] { q4Id, "Specs", 1 },
            new Object[] { q4Id, "Q4", 0 }
        ));

        List<CloudNodeResponse> responses = mapper.toResponses(List.of(rootFile, nestedFile));
        assertEquals("/", responses.get(0).folderPath());
        assertEquals("/Specs/Q4", responses.get(1).folderPath());
        verify(nodeRepo, times(1)).findAncestorPathRows(Set.of(q4Id));
    }

    private static CloudNodeEntity fileNode(CloudScope scope, UUID userId, String name, UUID parentId) {
        CloudNodeEntity n = new CloudNodeEntity();
        n.setId(UUID.randomUUID());
        n.setScopeType(scope.type());
        n.setScopeId(scope.scopeId());
        n.setParentId(parentId);
        n.setNodeType(CloudNodeType.FILE);
        n.setName(name);
        n.setNameNormalized(name.toLowerCase());
        n.setUploadStatus(CloudUploadStatus.READY);
        n.setCreatedBy(userId);
        n.setUpdatedBy(userId);
        return n;
    }
}
