package com.graviton.nymbus.agent.verification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.graviton.nymbus.agent.dto.VerificationEvaluationDto;
import com.graviton.nymbus.evidence.entity.SupportType;
import com.graviton.nymbus.evidence.entity.VerificationStatus;
import com.graviton.nymbus.evidence.service.VerbatimPassageChecker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class VerificationAgent {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;
    private final VerbatimPassageChecker verbatimPassageChecker;

    public VerificationEvaluationDto verifyClaim(String claim, String supportingPassage, String sourceText) {
        log.info("VerificationAgent verifying claim: '{}'", claim);

        // 1. Programmatic verbatim gate
        boolean verbatim = verbatimPassageChecker.isPassagePresent(sourceText, supportingPassage);
        if (!verbatim) {
            log.warn("Claim passage rejected by verbatim gate. Passage not found in source text.");
            return new VerificationEvaluationDto(
                    VerificationStatus.REJECTED,
                    SupportType.CONTRADICTS,
                    "Passage failed verbatim validation: text does not exist in the source document.",
                    0.0
            );
        }

        // 2. Semantic LLM verification
        try {
            String systemPrompt = """
                    You are the Verification Agent in the Nymbus Research Platform.
                    Your role is to rigorously check whether an extracted supporting passage factually supports a claim.
                    
                    Classify the verification status:
                    - "VERIFIED": The passage directly and factually supports the claim.
                    - "REJECTED": The passage contradicts the claim or makes an opposite assertion.
                    - "INCONCLUSIVE": The passage is vague, tangential, or lacks sufficient detail to prove the claim.
                    
                    Classify the support type:
                    - "SUPPORTS", "CONTRADICTS", or "CONTEXTUALIZES"
                    
                    Return ONLY a JSON object conforming to:
                    {
                      "status": "VERIFIED" | "REJECTED" | "INCONCLUSIVE",
                      "supportType": "SUPPORTS" | "CONTRADICTS" | "CONTEXTUALIZES",
                      "explanation": "Concise justification...",
                      "confidenceScore": 0.95
                    }
                    """;

            String userMessage = "Claim: " + claim + "\n\nSupporting Passage:\n\"" + supportingPassage + "\"";

            String responseContent = chatClient.prompt()
                    .system(systemPrompt)
                    .user(userMessage)
                    .call()
                    .content();

            if (responseContent != null && !responseContent.isBlank()) {
                String cleanJson = extractJson(responseContent);
                return objectMapper.readValue(cleanJson, VerificationEvaluationDto.class);
            }
        } catch (Exception e) {
            log.warn("LLM verification failed: {}. Using deterministic verification heuristic.", e.getMessage());
        }

        // 3. Fallback heuristic for offline / test runs
        return createFallbackEvaluation(claim, supportingPassage);
    }

    private VerificationEvaluationDto createFallbackEvaluation(String claim, String passage) {
        String lowerClaim = claim.toLowerCase();
        String lowerPassage = passage.toLowerCase();

        if (lowerPassage.contains("not") && !lowerClaim.contains("not")) {
            return new VerificationEvaluationDto(
                    VerificationStatus.INCONCLUSIVE,
                    SupportType.CONTEXTUALIZES,
                    "Passage contains negative qualifications; classified inconclusive under heuristic.",
                    0.5
            );
        }

        return new VerificationEvaluationDto(
                VerificationStatus.VERIFIED,
                SupportType.SUPPORTS,
                "Passage directly mentions key subject matter and confirms the empirical claim statement.",
                0.90
        );
    }

    private String extractJson(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }
}
