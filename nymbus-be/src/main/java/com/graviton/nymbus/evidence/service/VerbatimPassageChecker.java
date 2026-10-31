package com.graviton.nymbus.evidence.service;

import org.springframework.stereotype.Component;

@Component
public class VerbatimPassageChecker {

    /**
     * Checks if the candidate passage exists inside the source text.
     * Applies whitespace and case normalization to prevent false rejections
     * due to formatting/newlines while strictly preserving verbatim phrasing.
     */
    public boolean isPassagePresent(String sourceText, String passage) {
        if (sourceText == null || passage == null) {
            return false;
        }

        String normalizedSource = normalize(sourceText);
        String normalizedPassage = normalize(passage);

        if (normalizedPassage.isBlank()) {
            return false;
        }

        return normalizedSource.contains(normalizedPassage);
    }

    private String normalize(String input) {
        return input.toLowerCase()
                .replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
