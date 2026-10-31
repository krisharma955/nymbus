package com.graviton.nymbus.user.repository;

import com.graviton.nymbus.user.entity.AuthProvider;
import com.graviton.nymbus.user.entity.UserIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserIdentityRepository extends JpaRepository<UserIdentity, UUID> {

    Optional<UserIdentity> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);

    Optional<UserIdentity> findByUserIdAndProvider(UUID userId, AuthProvider provider);

    List<UserIdentity> findAllByUserId(UUID userId);
}
