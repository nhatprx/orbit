package com.orbit.ai.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.ai.config.AiProperties;
import com.orbit.ai.entity.AiProviderType;
import com.orbit.ai.gateway.LlmModels.LlmMessage;
import com.orbit.ai.gateway.LlmModels.LlmRequest;
import com.orbit.ai.gateway.LlmModels.LlmResponse;
import com.orbit.ai.gateway.LlmModels.LlmStreamListener;
import com.orbit.ai.gateway.LlmModels.LlmToolCall;
import com.orbit.ai.gateway.LlmModels.LlmToolSpec;
import com.orbit.common.ApiException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.ContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ConversationRole;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseRequest;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseResponse;
import software.amazon.awssdk.services.bedrockruntime.model.InferenceConfiguration;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;
import software.amazon.awssdk.services.bedrockruntime.model.Message;
import software.amazon.awssdk.services.bedrockruntime.model.SystemContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.Tool;
import software.amazon.awssdk.services.bedrockruntime.model.ToolConfiguration;
import software.amazon.awssdk.services.bedrockruntime.model.ToolInputSchema;
import software.amazon.awssdk.services.bedrockruntime.model.ToolResultBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ToolResultContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ToolSpecification;
import software.amazon.awssdk.services.bedrockruntime.model.ToolUseBlock;

@Component
public class BedrockLlmGateway implements LlmGateway {

    private static final Logger log = LoggerFactory.getLogger(BedrockLlmGateway.class);

    private final AiProperties properties;
    private final ObjectMapper objectMapper;
    private final Map<String, BedrockRuntimeClient> clients = new ConcurrentHashMap<>();

    public BedrockLlmGateway(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public AiProviderType provider() {
        return AiProviderType.BEDROCK;
    }

    @Override
    public boolean isConfigured() {
        try {
            DefaultCredentialsProvider.create().resolveCredentials();
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    @Override
    public LlmResponse complete(LlmRequest request, LlmStreamListener listener) {
        String region = request.region() != null && !request.region().isBlank()
            ? request.region()
            : properties.getBedrock().getRegion();
        BedrockRuntimeClient client = clientFor(region);

        ConverseRequest.Builder builder = ConverseRequest.builder()
            .modelId(request.modelId())
            .system(SystemContentBlock.fromText(request.systemPrompt()))
            .messages(toBedrockMessages(request.messages()))
            .inferenceConfig(InferenceConfiguration.builder().maxTokens(request.maxTokens()).build());

        if (request.tools() != null && !request.tools().isEmpty()) {
            builder.toolConfig(ToolConfiguration.builder().tools(toBedrockTools(request.tools())).build());
        }

        try {
            ConverseResponse response = client.converse(builder.build());
            return parseResponse(response, listener);
        } catch (Exception ex) {
            log.warn("AWS Bedrock converse failed: {}", ex.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_ERROR", "AWS Bedrock request failed: " + ex.getMessage());
        }
    }

    @Override
    public List<Float> embed(String modelId, String region, String text) {
        if (!isConfigured() || text == null || text.isBlank()) return List.of();
        try {
            String targetRegion = region != null && !region.isBlank() ? region : properties.getBedrock().getRegion();
            String payload = objectMapper.writeValueAsString(Map.of(
                "inputText", text.length() > 4000 ? text.substring(0, 4000) : text,
                "dimensions", 1024,
                "normalize", true
            ));
            InvokeModelResponse resp = clientFor(targetRegion).invokeModel(InvokeModelRequest.builder()
                .modelId(modelId)
                .contentType("application/json")
                .accept("application/json")
                .body(SdkBytes.fromUtf8String(payload))
                .build());
            JsonNode root = objectMapper.readTree(resp.body().asUtf8String());
            JsonNode vec = root.path("embedding");
            List<Float> result = new ArrayList<>(vec.size());
            for (JsonNode n : vec) result.add((float) n.asDouble());
            return result;
        } catch (Exception ex) {
            log.warn("AWS Bedrock embedding failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private BedrockRuntimeClient clientFor(String region) {
        return clients.computeIfAbsent(region, r -> BedrockRuntimeClient.builder()
            .region(Region.of(r))
            .credentialsProvider(DefaultCredentialsProvider.create())
            .build());
    }

    private List<Message> toBedrockMessages(List<LlmMessage> messages) {
        List<Message> out = new ArrayList<>();
        for (LlmMessage msg : messages) {
            if ("tool".equals(msg.role())) {
                ContentBlock resultBlock = ContentBlock.fromToolResult(ToolResultBlock.builder()
                    .toolUseId(msg.toolCallId())
                    .content(ToolResultContentBlock.fromText(msg.content()))
                    .build());
                out.add(Message.builder().role(ConversationRole.USER).content(resultBlock).build());
            } else if ("assistant".equals(msg.role())) {
                List<ContentBlock> blocks = new ArrayList<>();
                if (msg.content() != null && !msg.content().isBlank()) {
                    blocks.add(ContentBlock.fromText(msg.content()));
                }
                for (LlmToolCall call : msg.toolCalls()) {
                    blocks.add(ContentBlock.fromToolUse(ToolUseBlock.builder()
                        .toolUseId(call.id())
                        .name(call.name())
                        .input(BedrockDocumentMapper.toDocument(call.arguments()))
                        .build()));
                }
                if (!blocks.isEmpty()) {
                    out.add(Message.builder().role(ConversationRole.ASSISTANT).content(blocks).build());
                }
            } else {
                out.add(Message.builder().role(ConversationRole.USER).content(ContentBlock.fromText(msg.content())).build());
            }
        }
        return out;
    }

    private List<Tool> toBedrockTools(List<LlmToolSpec> specs) {
        List<Tool> tools = new ArrayList<>(specs.size());
        for (LlmToolSpec spec : specs) {
            tools.add(Tool.fromToolSpec(ToolSpecification.builder()
                .name(spec.name())
                .description(spec.description())
                .inputSchema(ToolInputSchema.fromJson(BedrockDocumentMapper.toDocument(spec.inputSchema())))
                .build()));
        }
        return tools;
    }

    private LlmResponse parseResponse(ConverseResponse response, LlmStreamListener listener) {
        StringBuilder text = new StringBuilder();
        List<LlmToolCall> calls = new ArrayList<>();
        if (response.output() != null && response.output().message() != null) {
            for (ContentBlock block : response.output().message().content()) {
                if (block.text() != null) {
                    text.append(block.text());
                    if (listener != null) listener.onToken(block.text());
                } else if (block.toolUse() != null) {
                    ToolUseBlock tu = block.toolUse();
                    calls.add(new LlmToolCall(tu.toolUseId(), tu.name(), BedrockDocumentMapper.toMap(tu.input())));
                }
            }
        }
        int inTok = response.usage() != null && response.usage().inputTokens() != null ? response.usage().inputTokens() : 0;
        int outTok = response.usage() != null && response.usage().outputTokens() != null ? response.usage().outputTokens() : 0;
        return new LlmResponse(text.toString(), calls, inTok, outTok);
    }
}
