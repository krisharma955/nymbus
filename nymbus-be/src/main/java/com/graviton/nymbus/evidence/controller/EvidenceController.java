package com.graviton.nymbus.evidence.controller;

import com.graviton.nymbus.evidence.dto.EvidenceDetailResponse;
import com.graviton.nymbus.evidence.service.EvidenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/evidence")
@RequiredArgsConstructor
public class EvidenceController {

    private final EvidenceService evidenceService;

    @GetMapping("/{evidenceId}")
    public ResponseEntity<EvidenceDetailResponse> getEvidenceDetail(@PathVariable UUID evidenceId) {
        EvidenceDetailResponse detail = evidenceService.getEvidenceDetail(evidenceId);
        return ResponseEntity.ok(detail);
    }
}
