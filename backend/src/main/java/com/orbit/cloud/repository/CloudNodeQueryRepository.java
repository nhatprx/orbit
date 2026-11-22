package com.orbit.cloud.repository;

import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.service.CloudCursor;
import com.orbit.cloud.service.CloudScope;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;

/** Dynamic keyset-paginated queries for Cloud Files listings, search, starred, and trash views. */
@Repository
public class CloudNodeQueryRepository {

    private final ObjectProvider<EntityManager> emProvider;

    public CloudNodeQueryRepository(ObjectProvider<EntityManager> emProvider) {
        this.emProvider = emProvider;
    }

    public List<CloudNodeEntity> findPage(
        CloudScope scope,
        UUID parentId,
        String view,
        String searchQuery,
        String sortBy,
        boolean ascending,
        CloudCursor cursor,
        int fetchLimit
    ) {
        StringBuilder jpql = new StringBuilder("SELECT n FROM CloudNodeEntity n WHERE ");
        jpql.append("n.scopeType = :scopeType AND n.scopeId = :scopeId ");

        String normalizedView = view == null ? "ALL" : view.trim().toUpperCase(Locale.ROOT);
        boolean hasSearch = searchQuery != null && !searchQuery.isBlank();
        boolean isRecursiveFileView = "RECENTS".equals(normalizedView)
            || "DOCS".equals(normalizedView)
            || "SHEETS".equals(normalizedView)
            || "SLIDES".equals(normalizedView);

        if ("TRASH".equals(normalizedView)) {
            jpql.append("AND n.deletedAt IS NOT NULL AND n.uploadStatus = :readyStatus ");
        } else {
            jpql.append("AND n.deletedAt IS NULL AND n.uploadStatus = :readyStatus ");
            if ("STARRED".equals(normalizedView)) {
                jpql.append("AND n.starred = true ");
            } else if (isRecursiveFileView) {
                jpql.append("AND n.nodeType = :fileType ");
                appendOfficeExtensionFilter(jpql, normalizedView);
            } else if (!hasSearch) {
                if (parentId == null) {
                    jpql.append("AND n.parentId IS NULL ");
                } else {
                    jpql.append("AND n.parentId = :parentId ");
                }
            }
        }

        if (hasSearch) {
            jpql.append("AND n.nameNormalized LIKE :searchPattern ESCAPE '\\' ");
        }

        String rankExpr = "CASE WHEN n.nodeType = :folderType THEN 0 ELSE 1 END";
        String sortField = switch (sortBy) {
            case "size" -> "n.sizeBytes";
            case "updatedAt" -> "n.updatedAt";
            default -> "n.nameNormalized";
        };
        String dir = ascending ? "ASC" : "DESC";
        String op = ascending ? ">" : "<";

        if (cursor != null) {
            jpql.append("AND ((").append(rankExpr).append(") > :cRank OR ((")
                .append(rankExpr).append(") = :cRank AND (")
                .append(sortField).append(" ").append(op).append(" :cVal OR (")
                .append(sortField).append(" = :cVal AND n.id ").append(op).append(" :cId)))) ");
        }

        jpql.append("ORDER BY ").append(rankExpr).append(" ASC, ")
            .append(sortField).append(" ").append(dir).append(", ")
            .append("n.id ").append(dir);

        TypedQuery<CloudNodeEntity> query = emProvider.getObject().createQuery(jpql.toString(), CloudNodeEntity.class);
        query.setParameter("scopeType", scope.type());
        query.setParameter("scopeId", scope.scopeId());
        query.setParameter("readyStatus", CloudUploadStatus.READY);
        query.setParameter("folderType", CloudNodeType.FOLDER);
        if (isRecursiveFileView) {
            query.setParameter("fileType", CloudNodeType.FILE);
        }

        if (!"TRASH".equals(normalizedView)
            && !"STARRED".equals(normalizedView)
            && !isRecursiveFileView
            && !hasSearch
            && parentId != null) {
            query.setParameter("parentId", parentId);
        }
        if (hasSearch) {
            String escaped = searchQuery.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
            query.setParameter("searchPattern", "%" + escaped + "%");
        }
        if (cursor != null) {
            query.setParameter("cRank", cursor.typeRank());
            query.setParameter("cId", cursor.id());
            switch (sortBy) {
                case "size" -> query.setParameter("cVal", cursor.sortValueAsLong());
                case "updatedAt" -> query.setParameter("cVal", cursor.sortValueAsInstant());
                default -> query.setParameter("cVal", cursor.sortValue());
            }
        }

        query.setMaxResults(fetchLimit);
        return query.getResultList();
    }

    private static void appendOfficeExtensionFilter(StringBuilder jpql, String view) {
        switch (view) {
            case "DOCS" -> jpql.append(
                "AND (n.nameNormalized LIKE '%.docx' OR n.nameNormalized LIKE '%.md' "
                    + "OR n.nameNormalized LIKE '%.txt' OR n.nameNormalized LIKE '%.pdf') "
            );
            case "SHEETS" -> jpql.append(
                "AND (n.nameNormalized LIKE '%.xlsx' OR n.nameNormalized LIKE '%.csv') "
            );
            case "SLIDES" -> jpql.append("AND n.nameNormalized LIKE '%.pptx' ");
            default -> {
                // RECENTS matches all active ready files across the scope.
            }
        }
    }
}
