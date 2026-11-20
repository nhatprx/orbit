package com.orbit.ai.memory;

import java.util.List;
import java.util.Map;

/** Abstraction over a managed cloud Vector DB (Qdrant Cloud, AWS OpenSearch, etc.). */
public interface VectorStoreClient {

    record VectorHit(String pointId, double score, Map<String, Object> payload) {}

    boolean isAvailable();

    boolean upsert(String pointId, List<Float> vector, Map<String, Object> payload);

    List<VectorHit> search(List<Float> queryVector, Map<String, String> filters, int limit);

    void delete(String pointId);
}
