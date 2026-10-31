package com.graviton.nymbus.evidence.service;

import com.graviton.nymbus.agent.dto.VerificationEvaluationDto;
import com.graviton.nymbus.agent.entity.AgentExecution;
import com.graviton.nymbus.agent.verification.VerificationAgent;
import com.graviton.nymbus.common.exception.ResourceNotFoundException;
import com.graviton.nymbus.evidence.dto.EvidenceDetailResponse;
import com.graviton.nymbus.evidence.entity.*;
import com.graviton.nymbus.evidence.repository.EvidenceRepository;
import com.graviton.nymbus.evidence.repository.EvidenceSourceRepository;
import com.graviton.nymbus.evidence.repository.VerificationResultRepository;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.source.entity.Source;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EvidenceService {

    private final EvidenceRepository evidenceRepository;
    private final EvidenceSourceRepository evidenceSourceRepository;
    private final VerificationResultRepository verificationResultRepository;
    private final VerificationAgent verificationAgent;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<Evidence> getEvidenceForTask(UUID researchTaskId) {
        return evidenceRepository.findByResearchTaskIdOrderByCreatedAtAsc(researchTaskId);
    }

    @Transactional(readOnly = true)
    public EvidenceDetailResponse getEvidenceDetail(UUID evidenceId) {
        Evidence evidence = evidenceRepository.findById(evidenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Evidence not found with id: " + evidenceId));

        User currentUser = currentUserService.getCurrentUser();
        if (evidence.getResearchTask() != null && evidence.getResearchTask().getUser() != null) {
            if (!evidence.getResearchTask().getUser().getId().equals(currentUser.getId())) {
                throw new ResourceNotFoundException("Evidence not found with id: " + evidenceId);
            }
        }

        List<EvidenceSource> sources = evidenceSourceRepository.findByEvidenceId(evidenceId);
        List<VerificationResult> results = verificationResultRepository.findByEvidenceIdOrderByCheckedAtDesc(evidenceId);

        return EvidenceDetailResponse.of(evidence, sources, results);
    }

    @Transactional
    public Evidence createAndVerifyEvidence(
            ResearchTask task,
            AgentExecution researchExecution,
            AgentExecution verificationExecution,
            Source source,
            String claimText,
            String supportingPassage,
            String locator) {

        // 1. Create Evidence in NOT_VERIFIED status
        Evidence evidence = Evidence.builder()
                .researchTask(task)
                .createdByExecution(researchExecution)
                .claim(claimText)
                .supportingPassage(supportingPassage)
                .verificationStatus(VerificationStatus.NOT_VERIFIED)
                .build();
        evidence = evidenceRepository.save(evidence);

        // 2. Perform Verification
        VerificationEvaluationDto evaluation = verificationAgent.verifyClaim(
                claimText, supportingPassage, source.getCleanedText());

        // 3. Atomically update Evidence status & confidence
        evidence.setVerificationStatus(evaluation.status());
        evidence.setConfidenceScore(BigDecimal.valueOf(evaluation.confidenceScore()));
        evidence = evidenceRepository.save(evidence);

        // 4. Save EvidenceSource provenance
        EvidenceSource es = EvidenceSource.builder()
                .evidence(evidence)
                .source(source)
                .sourceLocator(locator != null ? locator : source.getUrl())
                .supportType(evaluation.supportType())
                .relevantPassage(supportingPassage)
                .build();
        evidenceSourceRepository.save(es);

        // 5. Record VerificationResult audit row
        VerificationResult vr = VerificationResult.builder()
                .evidence(evidence)
                .agentExecution(verificationExecution)
                .status(evaluation.status())
                .explanation(evaluation.explanation())
                .metadata(Map.of(
                        "confidence", evaluation.confidenceScore(),
                        "supportType", evaluation.supportType().name()
                ))
                .build();
        verificationResultRepository.save(vr);

        log.info("Evidence {} evaluated: status={}, supportType={}",
                evidence.getId(), evaluation.status(), evaluation.supportType());

        return evidence;
    }
}
