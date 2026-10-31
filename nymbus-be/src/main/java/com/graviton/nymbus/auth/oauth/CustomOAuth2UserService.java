package com.graviton.nymbus.auth.oauth;

import com.graviton.nymbus.user.entity.AuthProvider;
import com.graviton.nymbus.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final OAuth2IdentityService oAuth2IdentityService;
    private final GitHubEmailService gitHubEmailService;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = new HashMap<>(oauth2User.getAttributes());

        if ("github".equalsIgnoreCase(registrationId)) {
            String providerUserId = String.valueOf(attributes.get("id"));
            String username = (String) attributes.get("login");
            String name = (String) attributes.get("name");
            String avatarUrl = (String) attributes.get("avatar_url");
            String email = (String) attributes.get("email");

            if (email == null || email.isBlank()) {
                String accessToken = userRequest.getAccessToken().getTokenValue();
                email = gitHubEmailService.fetchPrimaryEmail(accessToken).orElse(null);
                if (email != null) {
                    attributes.put("email", email);
                }
            }

            User user = oAuth2IdentityService.processUserLogin(
                    AuthProvider.GITHUB,
                    providerUserId,
                    email,
                    email != null,
                    name != null && !name.isBlank() ? name : username,
                    avatarUrl,
                    username
            );

            return new NymbusOAuth2User(
                    oauth2User.getAuthorities(),
                    attributes,
                    "id",
                    user
            );
        } else if ("google".equalsIgnoreCase(registrationId)) {
            String providerUserId = String.valueOf(attributes.get("sub"));
            String name = (String) attributes.get("name");
            String email = (String) attributes.get("email");
            Boolean emailVerified = (Boolean) attributes.get("email_verified");
            String avatarUrl = (String) attributes.get("picture");

            User user = oAuth2IdentityService.processUserLogin(
                    AuthProvider.GOOGLE,
                    providerUserId,
                    email,
                    Boolean.TRUE.equals(emailVerified),
                    name,
                    avatarUrl,
                    email
            );

            return new NymbusOAuth2User(
                    oauth2User.getAuthorities(),
                    attributes,
                    "sub",
                    user
            );
        }

        return oauth2User;
    }
}
