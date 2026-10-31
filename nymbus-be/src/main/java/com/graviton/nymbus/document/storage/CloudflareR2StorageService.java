package com.graviton.nymbus.document.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

@Slf4j
@Service
public class CloudflareR2StorageService implements ObjectStorageService {

    private final String bucket;
    private final S3Client s3Client;
    private final boolean r2Configured;
    private final Path localFallbackDir;

    public CloudflareR2StorageService(
            @Value("${cloudflare.r2.account-id:${CLOUDFLARE_R2_ACCOUNT_ID:}}") String accountId,
            @Value("${cloudflare.r2.access-key-id:${CLOUDFLARE_R2_ACCESS_KEY_ID:}}") String accessKeyId,
            @Value("${cloudflare.r2.secret-access-key:${CLOUDFLARE_R2_SECRET_ACCESS_KEY:}}") String secretAccessKey,
            @Value("${cloudflare.r2.bucket:${CLOUDFLARE_R2_BUCKET:nymbus-documents}}") String bucket,
            @Value("${nymbus.storage.local-fallback:data/uploads}") String localFallbackPath) {

        this.bucket = bucket;
        this.localFallbackDir = Paths.get(localFallbackPath);

        if (accountId != null && !accountId.isBlank()
                && accessKeyId != null && !accessKeyId.isBlank()
                && secretAccessKey != null && !secretAccessKey.isBlank()) {
            String endpoint = "https://" + accountId.trim() + ".r2.cloudflarestorage.com";
            this.s3Client = S3Client.builder()
                    .endpointOverride(URI.create(endpoint))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKeyId.trim(), secretAccessKey.trim())))
                    .region(Region.of("auto"))
                    .build();
            this.r2Configured = true;
            log.info("Cloudflare R2 Object Storage configured with bucket '{}'", bucket);
        } else {
            this.s3Client = null;
            this.r2Configured = false;
            try {
                Files.createDirectories(this.localFallbackDir);
            } catch (IOException e) {
                log.warn("Could not create local storage fallback dir: {}", e.getMessage());
            }
            log.info("Cloudflare R2 credentials not fully set. Using local directory fallback: {}", localFallbackDir.toAbsolutePath());
        }
    }

    @Override
    public String upload(String objectKey, byte[] data, String contentType) {
        if (r2Configured && s3Client != null) {
            try {
                PutObjectRequest request = PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(objectKey)
                        .contentType(contentType != null ? contentType : "application/octet-stream")
                        .build();
                s3Client.putObject(request, RequestBody.fromBytes(data));
                log.info("Uploaded object {} to Cloudflare R2 bucket {}", objectKey, bucket);
                return objectKey;
            } catch (Exception e) {
                log.error("Failed to upload to Cloudflare R2: {}. Falling back to local storage.", e.getMessage());
            }
        }

        // Local storage fallback
        try {
            Path targetPath = localFallbackDir.resolve(objectKey);
            if (targetPath.getParent() != null) {
                Files.createDirectories(targetPath.getParent());
            }
            Files.write(targetPath, data, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            log.info("Stored object {} in local fallback directory", objectKey);
            return objectKey;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store object: " + objectKey, e);
        }
    }

    @Override
    public byte[] download(String objectKey) {
        if (r2Configured && s3Client != null) {
            try {
                GetObjectRequest request = GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(objectKey)
                        .build();
                return s3Client.getObjectAsBytes(request).asByteArray();
            } catch (Exception e) {
                log.warn("Failed to download from Cloudflare R2: {}. Attempting local fallback.", e.getMessage());
            }
        }

        try {
            Path targetPath = localFallbackDir.resolve(objectKey);
            if (Files.exists(targetPath)) {
                return Files.readAllBytes(targetPath);
            }
            throw new RuntimeException("Object not found in local storage: " + objectKey);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read object: " + objectKey, e);
        }
    }

    @Override
    public void delete(String objectKey) {
        if (r2Configured && s3Client != null) {
            try {
                s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(bucket)
                        .key(objectKey)
                        .build());
            } catch (Exception ignored) {}
        }

        try {
            Path targetPath = localFallbackDir.resolve(objectKey);
            Files.deleteIfExists(targetPath);
        } catch (IOException ignored) {}
    }
}
