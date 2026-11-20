package com.orbit.support;

import com.jayway.jsonpath.JsonPath;
import com.orbit.auth.entity.UserEntity;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

/** Thin MockMvc wrapper so integration tests read as plain API calls. */
public final class ApiClient {

    public record Result(int status, String body) {
        public <T> T json(String path) {
            return JsonPath.read(body, path);
        }
    }

    private final MockMvc mvc;
    private final UserEntity user;

    public ApiClient(MockMvc mvc, UserEntity user) {
        this.mvc = mvc;
        this.user = user;
    }

    public Result get(String url) {
        return run(MockMvcRequestBuilders.get(url));
    }

    public Result post(String url, String json) {
        return run(MockMvcRequestBuilders.post(url).content(json));
    }

    public Result post(String url) {
        return run(MockMvcRequestBuilders.post(url));
    }

    public Result put(String url, String json) {
        return run(MockMvcRequestBuilders.put(url).content(json));
    }

    public Result patch(String url, String json) {
        return run(MockMvcRequestBuilders.patch(url).content(json));
    }

    public Result delete(String url) {
        return run(MockMvcRequestBuilders.delete(url));
    }

    public Result delete(String url, String json) {
        return run(MockMvcRequestBuilders.delete(url).content(json));
    }

    private Result run(MockHttpServletRequestBuilder builder) {
        try {
            MockHttpServletResponse response = mvc
                .perform(builder.contentType(MediaType.APPLICATION_JSON).with(AbstractIntegrationTest.as(user)))
                .andReturn()
                .getResponse();
            return new Result(response.getStatus(), response.getContentAsString());
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
