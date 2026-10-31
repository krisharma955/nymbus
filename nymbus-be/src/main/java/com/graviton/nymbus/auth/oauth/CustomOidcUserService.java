package com.graviton.nymbus.auth.oauth;

import com.graviton.nymbus.user.entity.AuthProvider;
import com.graviton.nymbus.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {

    private final OAuth2IdentityService oAuth2IdentityService;

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();

        if ("google".equalsIgnoreCase(registrationId)) {
            String providerUserId = oidcUser.getSubject();
            String email = oidcUser.getEmail();
            Boolean emailVerified = oidcUser.getEmailVerified();
            String name = oidcUser.getFullName();
            String avatarUrl = oidcUser.getPicture();

            User user = oAuth2IdentityService.processUserLogin(
                    AuthProvider.GOOGLE,
                    providerUserId,
                    email,
                    Boolean.TRUE.equals(emailVerified),
                    name,
                    avatarUrl,
                    email
            );

            return new NymbusOidcUser(
                    oidcUser.getAuthorities(),
                    oidcUser.getIdToken(),
                    oidcUser.getUserInfo(),
                    "sub",
                    user
            );
        }

        return oidcUser;
    }
}
