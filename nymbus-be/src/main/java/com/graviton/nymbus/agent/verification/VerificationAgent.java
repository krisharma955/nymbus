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

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class VerificationAgent {

    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
            "a", "an", "the", "and", "or", "but", "if", "because", "as", "what",
            "which", "this", "that", "these", "those", "then", "just", "so", "than",
            "such", "both", "through", "about", "for", "is", "of", "while", "during",
            "to", "from", "in", "out", "on", "off", "again", "further", "once",
            "here", "there", "when", "where", "why", "how", "all", "any", "each",
            "few", "more", "most", "other", "some", "no", "nor", "not", "only",
            "own", "same", "too", "very", "can", "will", "should",
            "now", "by", "with", "at", "be", "was", "were", "been", "being", "have", "has", "had"
    ));

    private static final Pattern NUMBER_PATTERN = Pattern.compile("\\b\\d+(?:\\.\\d+)?%?\\b");
    private static final Pattern WORD_PATTERN = Pattern.compile("\\b[a-zA-Z0-9_-]{2,}\\b");

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

        // 2. Semantic LLM verification with dynamic confidence scoring
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
<<<<<<< HEAD

                    Return ONLY a JSON object conforming to:
=======
                    
                    DYNAMIC CONFIDENCE SCORING RUBRIC (CRITICAL):
                    You must calculate and assign an authentic, unrounded confidence score between 0.00 and 1.00 based on evidential strength:
                    - 0.90 to 1.00: Direct, unambiguous factual proof with identical key facts, numbers, dates, or metrics.
                    - 0.70 to 0.89: Strong logical entailment where the claim is factually justified by the passage.
                    - 0.40 to 0.69: Partial, contextual, or circumstantial support; key details remain unproven.
                    - 0.10 to 0.39: Tangential, vague, or weakly related statement.
                    - 0.00 to 0.09: Explicit contradiction, opposite assertion, or non-sequitur.
                    
                    Do NOT hardcode standard rounded numbers (such as 0.90, 0.95, or 1.00). Calculate and output the exact granular decimal reflecting your actual assessment (e.g. 0.87, 0.74, 0.92, 0.46, etc.).
                    
                    Return ONLY a JSON object conforming strictly to:
>>>>>>> a692773 (rag, user documents & r2 storage: phase 3)
                    {
                      "status": "VERIFIED" | "REJECTED" | "INCONCLUSIVE",
                      "supportType": "SUPPORTS" | "CONTRADICTS" | "CONTEXTUALIZES",
                      "explanation": "Concise factual justification explaining why the passage supports, contradicts, or leaves the claim inconclusive.",
                      "confidenceScore": <calculated_float_between_0.0_and_1.0>
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
            log.warn("LLM verification failed: {}. Using algorithmic text verification.", e.getMessage());
        }

        // 3. Dynamic algorithmic evaluation (computes real confidence from text metrics)
        return computeAlgorithmicEvaluation(claim, supportingPassage);
    }

    private VerificationEvaluationDto computeAlgorithmicEvaluation(String claim, String passage) {
        if (claim == null || claim.isBlank() || passage == null || passage.isBlank()) {
            return new VerificationEvaluationDto(
                    VerificationStatus.REJECTED,
                    SupportType.CONTRADICTS,
                    "Insufficient textual content to perform factual verification.",
                    0.0
            );
        }

        String lowerClaim = claim.toLowerCase(Locale.ROOT);
        String lowerPassage = passage.toLowerCase(Locale.ROOT);

        boolean passageHasNegation = containsNegation(lowerPassage);
        boolean claimHasNegation = containsNegation(lowerClaim);
        boolean negationMismatch = passageHasNegation != claimHasNegation;

        Set<String> claimTerms = extractContentTerms(lowerClaim);
        Set<String> passageTerms = extractContentTerms(lowerPassage);

        if (claimTerms.isEmpty()) {
            return new VerificationEvaluationDto(
                    VerificationStatus.INCONCLUSIVE,
                    SupportType.CONTEXTUALIZES,
                    "Claim lacks distinct substantive entities or terms to verify.",
                    0.40
            );
        }

        // Measure key content term recall
        int matchedTerms = 0;
        for (String term : claimTerms) {
            if (passageTerms.contains(term) || lowerPassage.contains(term)) {
                matchedTerms++;
            }
        }
        double termRecall = (double) matchedTerms / claimTerms.size();

        // Check quantitative/numerical match
        List<String> numbersInClaim = extractNumbers(lowerClaim);
        double numberScore = 1.0;
        if (!numbersInClaim.isEmpty()) {
            int matchedNumbers = 0;
            for (String num : numbersInClaim) {
                if (lowerPassage.contains(num)) {
                    matchedNumbers++;
                }
            }
            numberScore = (double) matchedNumbers / numbersInClaim.size();
        }

        // Calculate genuine blended score
        double rawScore;
        if (negationMismatch) {
            rawScore = Math.max(0.10, (termRecall * 0.40) * numberScore);
        } else {
            rawScore = (termRecall * 0.70) + (numberScore * 0.30);
        }

        // Round to 3 decimal places
        double computedConfidence = Math.round(Math.min(0.98, Math.max(0.05, rawScore)) * 1000.0) / 1000.0;

        VerificationStatus status;
        SupportType supportType;
        String explanation;

        if (negationMismatch && computedConfidence < 0.50) {
            status = VerificationStatus.REJECTED;
            supportType = SupportType.CONTRADICTS;
            explanation = String.format("Passage contains conflicting polarity/negation relative to the claim (term overlap: %d/%d terms, computed confidence: %.2f).",
                    matchedTerms, claimTerms.size(), computedConfidence);
        } else if (computedConfidence >= 0.70) {
            status = VerificationStatus.VERIFIED;
            supportType = SupportType.SUPPORTS;
            explanation = String.format("Passage factually validates the claim with %d of %d key terms and verified metrics (computed confidence: %.2f).",
                    matchedTerms, claimTerms.size(), computedConfidence);
        } else {
            status = VerificationStatus.INCONCLUSIVE;
            supportType = SupportType.CONTEXTUALIZES;
            explanation = String.format("Passage provides partial context but insufficient definitive proof (%d of %d key terms matched, computed confidence: %.2f).",
                    matchedTerms, claimTerms.size(), computedConfidence);
        }

        return new VerificationEvaluationDto(status, supportType, explanation, computedConfidence);
    }

    private boolean containsNegation(String text) {
        return text.contains(" not ") || text.contains(" never ") || text.contains(" no ")
                || text.contains(" neither ") || text.contains(" nor ") || text.contains(" fail")
                || text.contains(" reject") || text.contains(" impossible") || text.contains(" without ");
    }

    private Set<String> extractContentTerms(String text) {
        Set<String> terms = new HashSet<>();
        Matcher matcher = WORD_PATTERN.matcher(text);
        while (matcher.find()) {
            String word = matcher.group().toLowerCase(Locale.ROOT);
            if (!STOP_WORDS.contains(word)) {
                terms.add(word);
            }
        }
        return terms;
    }

    private List<String> extractNumbers(String text) {
        List<String> numbers = new ArrayList<>();
        Matcher matcher = NUMBER_PATTERN.matcher(text);
        while (matcher.find()) {
            numbers.add(matcher.group());
        }
        return numbers;
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
