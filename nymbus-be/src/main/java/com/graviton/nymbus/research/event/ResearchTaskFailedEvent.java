package com.graviton.nymbus.research.event;

import java.util.UUID;

public record ResearchTaskFailedEvent(
        UUID taskId,
        String errorMessage
) {}
