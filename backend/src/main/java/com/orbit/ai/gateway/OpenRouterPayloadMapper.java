package com.orbit.ai.gateway;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.ai.gateway.LlmModels.LlmMessage;
import com.orbit.ai.gateway.LlmModels.LlmToolCall;
import com.orbit.ai.gateway.LlmModels.LlmToolSpec;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Maps internal LLM messages/tools to OpenRouter OpenAI-compatible payloads and parses responses. */
final class OpenRouterPayloadMapper {

    private OpenRouterPayloadMapper() {}

    static List<Map<String, Object>> toOpenAiMessages(ObjectMapper mapper, String systemPrompt, List<LlmMessage> messages) {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(Map.of("role", "system", "content", systemPrompt));
        for (LlmMessage msg : messages) {
            if ("tool".equals(msg.role())) {
                list.add(Map.of("role", "tool", "tool_call_id", msg.toolCallId(), "content", msg.content()));
            } else if ("assistant".equals(msg.role()) && !msg.toolCalls().isEmpty()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("role", "assistant");
                row.put("content", msg.content() != null ? msg.content() : "");
                List<Map<String, Object>> tcs = new ArrayList<>();
                for (LlmToolCall tc : msg.toolCalls()) {
                    tcs.add(Map.of("id", tc.id(), "type", "function",
                        "function", Map.of("name", tc.name(), "arguments", writeJson(mapper, tc.arguments()))));
                }
                row.put("tool_calls", tcs);
                list.add(row);
            } else {
                list.add(Map.of("role", msg.role(), "content", msg.content()));
            }
        }
        return list;
    }

    static List<Map<String, Object>> toOpenAiTools(List<LlmToolSpec> specs) {
        List<Map<String, Object>> tools = new ArrayList<>(specs.size());
        for (LlmToolSpec spec : specs) {
            tools.add(Map.of("type", "function", "function", Map.of(
                "name", spec.name(),
                "description", spec.description(),
                "parameters", spec.inputSchema()
            )));
        }
        return tools;
    }

    static List<LlmToolCall> parseToolCalls(ObjectMapper mapper, JsonNode message) throws Exception {
        List<LlmToolCall> calls = new ArrayList<>();
        for (JsonNode tc : message.path("tool_calls")) {
            String id = tc.path("id").asText();
            String name = tc.path("function").path("name").asText();
            String argsStr = tc.path("function").path("arguments").asText("{}");
            Map<String, Object> args = mapper.readValue(argsStr, new TypeReference<>() {});
            calls.add(new LlmToolCall(id, name, args));
        }
        return calls;
    }

    static String cleanContent(String raw) {
        if (raw == null || raw.isEmpty()) return "";
        return raw.replaceAll("(?s)<think>.*?</think>\\s*", "").trim();
    }

    static BigDecimal parseCost(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(node.asText("0"));
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }

    private static String writeJson(ObjectMapper mapper, Object obj) {
        try {
            return mapper.writeValueAsString(obj);
        } catch (Exception ex) {
            return "{}";
        }
    }
}
