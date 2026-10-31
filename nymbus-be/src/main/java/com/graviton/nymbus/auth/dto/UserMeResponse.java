package com.graviton.nymbus.auth.dto;

import com.graviton.nymbus.user.entity.UserRole;

import java.util.UUID;

public record UserMeResponse(
        UUID id,
        String name,
        String email,
        boolean emailVerified,
        String avatarUrl,
        UserRole role
) {}
