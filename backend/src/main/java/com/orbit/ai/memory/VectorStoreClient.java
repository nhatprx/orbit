package com.orbit.ai.memory;

import java.util.List;
import java.util.Map;

/** Abstraction over a managed cloud Vector DB (Qdrant Cloud, AWS OpenSearch, etc.). */
public interface VectorStoreClient {

    record VectorHit(String pointId, double score, Map<String, Object> payload) {}

    boolean isAvailable();

    boolean upsert(String collection, String pointId, List<Float> vector, Map<String, Object> payload);

    List<VectorHit> search(String collection, List<Float> queryVector, Map<String, String> filters, int limit);

    void delete(String collection, String pointId);

    default boolean upsert(String pointId, List<Float> vector, Map<String, Object> payload) {
        return upsert(null, pointId, vector, payload);
    }

    default List<VectorHit> search(List<Float> queryVector, Map<String, String> filters, int limit) {
        return search(null, queryVector, filters, limit);
    }

    default void delete(String pointId) {
        delete(null, pointId);
    }
}
