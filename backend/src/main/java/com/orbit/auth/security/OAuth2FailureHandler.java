package com.orbit.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2FailureHandler implements AuthenticationFailureHandler {

    private final String frontendUrl;

    public OAuth2FailureHandler(
        @Value("${orbit.frontend.url:http://localhost:5173}") String frontendUrl
    ) {
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationFailure(
        HttpServletRequest request,
        HttpServletResponse response,
        AuthenticationException exception
    ) throws IOException {
        String message = exception.getMessage() != null
            ? exception.getMessage()
            : "OAuth authentication failed.";

        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl)
            .queryParam("oauth_error", message)
            .build()
            .encode()
            .toUriString();

        response.sendRedirect(targetUrl);
    }
}
