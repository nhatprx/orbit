package com.orbit.auth.security;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.service.OAuthUserProvisioningService;
import com.orbit.auth.service.RedisSessionService;
import com.orbit.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    public static final String LINK_USER_ID_ATTR = "ORBIT_OAUTH_LINK_USER_ID";
    public static final String LINK_PROVIDER_ATTR = "ORBIT_OAUTH_LINK_PROVIDER";

    private final OAuthUserProvisioningService provisioningService;
    private final RedisSessionService redisSessionService;
    private final String frontendUrl;

    public OAuth2SuccessHandler(
        OAuthUserProvisioningService provisioningService,
        RedisSessionService redisSessionService,
        @Value("${orbit.frontend.url:http://localhost:5173}") String frontendUrl
    ) {
        this.provisioningService = provisioningService;
        this.redisSessionService = redisSessionService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        String provider = oauthToken.getAuthorizedClientRegistrationId();
        OAuth2User oauth2User = oauthToken.getPrincipal();

        UUID linkUserId = consumeLinkIntent(request, provider);
        if (linkUserId != null) {
            handleAccountLink(response, linkUserId, provider, oauth2User);
            return;
        }

        UserEntity user = provisioningService.provisionOAuthUser(provider, oauth2User);
        String exchangeCode = redisSessionService.createOAuthExchangeCode(user.getId());

        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl)
            .queryParam("oauth_code", exchangeCode)
            .build()
            .toUriString();

        response.sendRedirect(targetUrl);
    }

    private UUID consumeLinkIntent(HttpServletRequest request, String provider) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        Object rawUserId = session.getAttribute(LINK_USER_ID_ATTR);
        Object rawProvider = session.getAttribute(LINK_PROVIDER_ATTR);
        session.removeAttribute(LINK_USER_ID_ATTR);
        session.removeAttribute(LINK_PROVIDER_ATTR);
        if (rawUserId == null || rawProvider == null) return null;
        if (!provider.equalsIgnoreCase(rawProvider.toString())) return null;
        try {
            return UUID.fromString(rawUserId.toString());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private void handleAccountLink(
        HttpServletResponse response,
        UUID userId,
        String provider,
        OAuth2User oauth2User
    ) throws IOException {
        try {
            provisioningService.linkOAuthAccount(userId, provider, oauth2User);
            String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl)
                .queryParam("oauth_linked", provider)
                .build()
                .encode()
                .toUriString();
            response.sendRedirect(targetUrl);
        } catch (ApiException ex) {
            String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl)
                .queryParam("oauth_link_error", ex.getMessage())
                .build()
                .encode()
                .toUriString();
            response.sendRedirect(targetUrl);
        }
    }
}
