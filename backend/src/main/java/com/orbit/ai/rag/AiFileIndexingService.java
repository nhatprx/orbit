package com.orbit.ai.rag;

import com.orbit.ai.config.AiProperties;
import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.gateway.LlmGatewayRouter;
import com.orbit.ai.memory.VectorStoreClient;
import com.orbit.ai.rag.DocumentTextExtractor.ExtractedPage;
import com.orbit.ai.rag.TextChunker.TextChunk;
import com.orbit.ai.rag.entity.AiDocumentChunkEntity;
import com.orbit.ai.rag.entity.AiDocumentIndexStatusEntity;
import com.orbit.ai.rag.repository.AiDocumentChunkRepository;
import com.orbit.ai.rag.repository.AiDocumentIndexStatusRepository;
import com.orbit.ai.service.AiProviderConfigService;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.event.CloudFileReadyEvent;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.storage.service.CloudDownloadSigner;
import com.orbit.storage.service.CloudDownloadSigner.SignedDownloadUrl;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Background RAG indexer: extracts PDF/DOCX/Markdown/Code, chunks, embeds, and indexes to Qdrant Cloud. */
@Service
public class AiFileIndexingService {

    private static final Logger log = LoggerFactory.getLogger(AiFileIndexingService.class);
    private static final int MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024;

    private final CloudNodeRepository nodeRepository;
    private final AiDocumentIndexStatusRepository statusRepository;
    private final AiDocumentChunkRepository chunkRepository;
    private final CloudDownloadSigner downloadSigner;
    private final DocumentTextExtractor extractor;
    private final TextChunker chunker;
    private final AiProviderConfigService configService;
    private final LlmGatewayRouter gatewayRouter;
    private final VectorStoreClient vectorStore;
    private final AiProperties properties;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

    public AiFileIndexingService(
        CloudNodeRepository nodeRepository, AiDocumentIndexStatusRepository statusRepository,
        AiDocumentChunkRepository chunkRepository, CloudDownloadSigner downloadSigner,
        DocumentTextExtractor extractor, TextChunker chunker,
        AiProviderConfigService configService, LlmGatewayRouter gatewayRouter,
        VectorStoreClient vectorStore, AiProperties properties
    ) {
        this.nodeRepository = nodeRepository;
        this.statusRepository = statusRepository;
        this.chunkRepository = chunkRepository;
        this.downloadSigner = downloadSigner;
        this.extractor = extractor;
        this.chunker = chunker;
        this.configService = configService;
        this.gatewayRouter = gatewayRouter;
        this.vectorStore = vectorStore;
        this.properties = properties;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCloudFileReady(CloudFileReadyEvent event) {
        triggerAsyncIndex(event.nodeId());
    }

    public void triggerAsyncIndex(UUID nodeId) {
        Thread.ofVirtual().start(() -> indexNode(nodeId));
    }

    public void indexNode(UUID nodeId) {
        CloudNodeEntity node = nodeRepository.findById(nodeId).orElse(null);
        if (node == null || node.getDeletedAt() != null || node.getNodeType() != CloudNodeType.FILE
            || node.getUploadStatus() != CloudUploadStatus.READY || node.getStorageKey() == null) {
            return;
        }
        AiDocumentIndexStatusEntity status = initStatus(node);
        if (!extractor.isSupported(node.getMimeType(), node.getName())) {
            markStatus(status, "UNSUPPORTED", 0, "File format is not text-indexable.");
            return;
        }
        if (node.getSizeBytes() > MAX_DOWNLOAD_BYTES) {
            markStatus(status, "UNSUPPORTED", 0, "File exceeds 15 MB RAG indexing limit.");
            return;
        }
        markStatus(status, "INDEXING", 0, null);
        try {
            byte[] bytes = downloadBytes(node);
            List<ExtractedPage> pages = extractor.extract(bytes, node.getMimeType(), node.getName());
            List<TextChunk> chunks = chunker.chunk(pages);
            if (chunks.isEmpty()) {
                markStatus(status, "UNSUPPORTED", 0, "No extractable text found in file.");
                return;
            }
            replaceChunks(node, chunks);
            status.setIndexedAt(Instant.now());
            markStatus(status, "READY", chunks.size(), null);
        } catch (Exception ex) {
            log.warn("RAG indexing failed for node {}: {}", nodeId, ex.getMessage());
            markStatus(status, "FAILED", 0, truncate(ex.getMessage(), 450));
        }
    }

    @Transactional
    protected void replaceChunks(CloudNodeEntity node, List<TextChunk> chunks) {
        String collection = properties.getQdrant().getFilesCollection();
        for (AiDocumentChunkEntity old : chunkRepository.findByNodeId(node.getId())) {
            if (old.getQdrantPointId() != null) vectorStore.delete(collection, old.getQdrantPointId());
        }
        chunkRepository.deleteByNodeId(node.getId());
        chunkRepository.flush();

        AiProviderConfigEntity cfg = configService.getActiveEntity();
        for (TextChunk tc : chunks) {
            AiDocumentChunkEntity entity = new AiDocumentChunkEntity();
            entity.setId(UUID.randomUUID());
            entity.setNodeId(node.getId());
            entity.setScopeType(node.getScopeType().name());
            entity.setScopeId(node.getScopeId());
            entity.setWorkspaceId(node.getWorkspaceId());
            entity.setProjectId(node.getProjectId());
            entity.setFilename(node.getName());
            entity.setChunkIndex(tc.chunkIndex());
            entity.setPageNumber(tc.pageNumber());
            entity.setContent(tc.content());

            if (vectorStore.isAvailable()) {
                List<Float> vec = gatewayRouter.embed(cfg, tc.content());
                if (!vec.isEmpty()) {
                    Map<String, Object> payload = new LinkedHashMap<>();
                    payload.put("nodeId", node.getId().toString());
                    payload.put("scopeType", node.getScopeType().name());
                    payload.put("scopeId", node.getScopeId().toString());
                    payload.put("filename", node.getName());
                    payload.put("chunkIndex", tc.chunkIndex());
                    if (tc.pageNumber() != null) payload.put("pageNumber", tc.pageNumber());
                    payload.put("content", tc.content());
                    String pointId = entity.getId().toString();
                    if (vectorStore.upsert(collection, pointId, vec, payload)) {
                        entity.setQdrantPointId(pointId);
                    }
                }
            }
            chunkRepository.save(entity);
        }
    }

    private byte[] downloadBytes(CloudNodeEntity node) throws Exception {
        SignedDownloadUrl signed = downloadSigner.signDownload(node.getStorageKey(), node.getName(), node.getMimeType());
        HttpRequest req = HttpRequest.newBuilder().uri(URI.create(signed.url())).timeout(Duration.ofSeconds(30)).GET().build();
        HttpResponse<InputStream> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofInputStream());
        if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
            throw new IllegalStateException("Storage returned HTTP " + resp.statusCode());
        }
        try (InputStream in = resp.body()) {
            return in.readNBytes(MAX_DOWNLOAD_BYTES);
        }
    }

    private AiDocumentIndexStatusEntity initStatus(CloudNodeEntity node) {
        AiDocumentIndexStatusEntity s = statusRepository.findById(node.getId()).orElseGet(AiDocumentIndexStatusEntity::new);
        s.setNodeId(node.getId());
        s.setScopeType(node.getScopeType().name());
        s.setScopeId(node.getScopeId());
        s.setWorkspaceId(node.getWorkspaceId());
        s.setProjectId(node.getProjectId());
        s.setFilename(node.getName());
        return s;
    }

    private void markStatus(AiDocumentIndexStatusEntity s, String state, int count, String error) {
        s.setStatus(state);
        s.setChunkCount(count);
        s.setErrorMessage(error);
        statusRepository.save(s);
    }

    private String truncate(String text, int max) {
        if (text == null) return "Indexing error";
        return text.length() <= max ? text : text.substring(0, max);
    }
}
