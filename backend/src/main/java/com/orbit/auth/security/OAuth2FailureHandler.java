package com.orbit.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
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

        boolean wasLinkFlow = false;
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute(OAuth2SuccessHandler.LINK_USER_ID_ATTR) != null) {
            wasLinkFlow = true;
            session.removeAttribute(OAuth2SuccessHandler.LINK_USER_ID_ATTR);
            session.removeAttribute(OAuth2SuccessHandler.LINK_PROVIDER_ATTR);
        }

        String paramName = wasLinkFlow ? "oauth_link_error" : "oauth_error";
        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl)
            .queryParam(paramName, message)
            .build()
            .encode()
            .toUriString();

        response.sendRedirect(targetUrl);
    }
}
