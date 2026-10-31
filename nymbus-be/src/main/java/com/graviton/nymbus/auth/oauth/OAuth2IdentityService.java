package com.graviton.nymbus.auth.oauth;

import com.graviton.nymbus.user.entity.AuthProvider;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.entity.UserIdentity;
import com.graviton.nymbus.user.entity.UserRole;
import com.graviton.nymbus.user.repository.UserIdentityRepository;
import com.graviton.nymbus.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuth2IdentityService {

    private final UserRepository userRepository;
    private final UserIdentityRepository userIdentityRepository;

    @Transactional
    public User processUserLogin(
            AuthProvider provider,
            String providerUserId,
            String email,
            boolean emailVerified,
            String name,
            String avatarUrl,
            String providerUsername
    ) {
        Instant now = Instant.now();
        Optional<UserIdentity> existingIdentityOpt = userIdentityRepository
                .findByProviderAndProviderUserId(provider, providerUserId);

        if (existingIdentityOpt.isPresent()) {
            UserIdentity identity = existingIdentityOpt.get();
            identity.setLastLoginAt(now);
            if (providerUsername != null) {
                identity.setProviderUsername(providerUsername);
            }
            if (email != null) {
                identity.setProviderEmail(email);
            }
            userIdentityRepository.save(identity);

            User user = identity.getUser();
            user.setLastLoginAt(now);
            if (avatarUrl != null && user.getAvatarUrl() == null) {
                user.setAvatarUrl(avatarUrl);
            }
            if (name != null && (user.getName() == null || user.getName().isBlank())) {
                user.setName(name);
            }
            return userRepository.save(user);
        }

        // Check if an existing user has the same email
        User user = null;
        if (email != null && !email.isBlank()) {
            user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        }

        if (user == null) {
            user = User.builder()
                    .name(name != null && !name.isBlank() ? name : "User")
                    .email(email)
                    .emailVerified(emailVerified)
                    .avatarUrl(avatarUrl)
                    .role(UserRole.USER)
                    .lastLoginAt(now)
                    .build();
            user = userRepository.save(user);
            log.info("Created new user {} via OAuth provider {}", user.getId(), provider);
        } else {
            user.setLastLoginAt(now);
            if (avatarUrl != null && user.getAvatarUrl() == null) {
                user.setAvatarUrl(avatarUrl);
            }
            user = userRepository.save(user);
            log.info("Linked existing user {} to new OAuth provider {}", user.getId(), provider);
        }

        UserIdentity newIdentity = UserIdentity.builder()
                .user(user)
                .provider(provider)
                .providerUserId(providerUserId)
                .providerUsername(providerUsername)
                .providerEmail(email)
                .lastLoginAt(now)
                .build();
        userIdentityRepository.save(newIdentity);

        return user;
    }
}
