package com.orbit.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "orbit.ai")
public class AiProperties {

    private String provider = "BEDROCK";
    private boolean webSearchEnabled = true;
    private int rateLimitPerMinute = 20;
    private Bedrock bedrock = new Bedrock();
    private OpenRouter openrouter = new OpenRouter();
    private Qdrant qdrant = new Qdrant();
    private Tavily tavily = new Tavily();

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public boolean isWebSearchEnabled() { return webSearchEnabled; }
    public void setWebSearchEnabled(boolean webSearchEnabled) { this.webSearchEnabled = webSearchEnabled; }
    public int getRateLimitPerMinute() { return rateLimitPerMinute; }
    public void setRateLimitPerMinute(int rateLimitPerMinute) { this.rateLimitPerMinute = rateLimitPerMinute; }
    public Bedrock getBedrock() { return bedrock; }
    public void setBedrock(Bedrock bedrock) { this.bedrock = bedrock; }
    public OpenRouter getOpenrouter() { return openrouter; }
    public void setOpenrouter(OpenRouter openrouter) { this.openrouter = openrouter; }
    public Qdrant getQdrant() { return qdrant; }
    public void setQdrant(Qdrant qdrant) { this.qdrant = qdrant; }
    public Tavily getTavily() { return tavily; }
    public void setTavily(Tavily tavily) { this.tavily = tavily; }

    public static class Bedrock {
        private String region = "us-east-1";
        private String fastModel = "us.amazon.nova-micro-v1:0";
        private String proModel = "us.amazon.nova-micro-v1:0";
        private String coderModel = "us.amazon.nova-micro-v1:0";
        private String embedModel = "amazon.titan-embed-text-v2:0";

        public String getRegion() { return region; }
        public void setRegion(String region) { this.region = region; }
        public String getFastModel() { return fastModel; }
        public void setFastModel(String fastModel) { this.fastModel = fastModel; }
        public String getProModel() { return proModel; }
        public void setProModel(String proModel) { this.proModel = proModel; }
        public String getCoderModel() { return coderModel; }
        public void setCoderModel(String coderModel) { this.coderModel = coderModel; }
        public String getEmbedModel() { return embedModel; }
        public void setEmbedModel(String embedModel) { this.embedModel = embedModel; }
    }

    public static class OpenRouter {
        private String apiKey = "";
        private String baseUrl = "https://openrouter.ai/api/v1";
        private String fastModel = "google/gemini-2.5-flash";
        private String proModel = "anthropic/claude-3.7-sonnet";
        private String coderModel = "anthropic/claude-3.7-sonnet";
        private String embedModel = "openai/text-embedding-3-small";

        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
        public String getFastModel() { return fastModel; }
        public void setFastModel(String fastModel) { this.fastModel = fastModel; }
        public String getProModel() { return proModel; }
        public void setProModel(String proModel) { this.proModel = proModel; }
        public String getCoderModel() { return coderModel; }
        public void setCoderModel(String coderModel) { this.coderModel = coderModel; }
        public String getEmbedModel() { return embedModel; }
        public void setEmbedModel(String embedModel) { this.embedModel = embedModel; }
    }

    public static class Qdrant {
        private String url = "";
        private String apiKey = "";
        private String collection = "orbit_ai_memories";
        private String filesCollection = "orbit_file_chunks";

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getCollection() { return collection; }
        public void setCollection(String collection) { this.collection = collection; }
        public String getFilesCollection() { return filesCollection; }
        public void setFilesCollection(String filesCollection) { this.filesCollection = filesCollection; }
    }

    public static class Tavily {
        private String apiKey = "";

        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    }
}
