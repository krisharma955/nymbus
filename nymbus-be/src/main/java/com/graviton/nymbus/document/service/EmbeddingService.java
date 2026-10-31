package com.graviton.nymbus.document.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

@Slf4j
@Service
public class EmbeddingService {

    public static final int EMBEDDING_DIMENSION = 1536;

    private final EmbeddingModel embeddingModel;

    @Autowired
    public EmbeddingService(@Autowired(required = false) EmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
        if (embeddingModel != null) {
            log.info("Initialized EmbeddingService with Spring AI EmbeddingModel");
        } else {
            log.info("EmbeddingModel not available; using deterministic 1536-dim vector generator");
        }
    }

    public float[] computeEmbedding(String text) {
        if (text == null || text.isBlank()) {
            return new float[EMBEDDING_DIMENSION];
        }

        if (embeddingModel != null) {
            try {
                float[] result = embeddingModel.embed(text);
                if (result != null && result.length == EMBEDDING_DIMENSION) {
                    return result;
                }
            } catch (Exception e) {
                log.warn("EmbeddingModel call failed: {}. Falling back to deterministic embedding.", e.getMessage());
            }
        }

        return generateDeterministicVector(text);
    }

    public String toVectorString(float[] vector) {
        if (vector == null || vector.length == 0) {
            return "[]";
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(String.format(java.util.Locale.US, "%.6f", vector[i]));
        }
        sb.append("]");
        return sb.toString();
    }

    private float[] generateDeterministicVector(String text) {
        float[] vector = new float[EMBEDDING_DIMENSION];
        String[] tokens = text.toLowerCase().split("\\W+");
        if (tokens.length == 0) return vector;

        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            for (String token : tokens) {
                if (token.isBlank()) continue;
                byte[] hash = md.digest(token.getBytes(StandardCharsets.UTF_8));
                // Distribute token hash across vector dimensions
                for (int i = 0; i < hash.length && i * 48 < EMBEDDING_DIMENSION; i++) {
                    int index = Math.abs((hash[i] * 31 + i) % EMBEDDING_DIMENSION);
                    vector[index] += 1.0f;
                }
            }

            // Normalize vector to unit length (L2 norm)
            double norm = 0.0;
            for (float v : vector) {
                norm += v * v;
            }
            norm = Math.sqrt(norm);
            if (norm > 0) {
                for (int i = 0; i < vector.length; i++) {
                    vector[i] = (float) (vector[i] / norm);
                }
            }
        } catch (NoSuchAlgorithmException e) {
            Arrays.fill(vector, 0.0f);
        }

        return vector;
    }
}
