package com.exprivia.exhelpdesk.service;

import com.exprivia.exhelpdesk.dto.AttachmentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.net.URLConnection;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StorageService {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.bucketName}")
    private String bucketName;

    @Value("${aws.presigned-url-expiration-seconds}")
    private long presignedExpirationSeconds;

    public AttachmentDto uploadTicketAttachment(String ticketId, MultipartFile file) {
        validate(file);
        String key = "tickets/" + ticketId + "/" + UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
        putObject(key, file);

        AttachmentDto dto = new AttachmentDto();
        dto.setNomeFile(file.getOriginalFilename());
        dto.setS3Key(key);
        dto.setUrl(generatePresignedUrl(key));
        dto.setDimensione(file.getSize());
        return dto;
    }

    public String uploadProfileAvatar(String userId, MultipartFile file) {
        validate(file);
        String key = "profiles/" + userId + "/" + UUID.randomUUID() + "_avatar_" + sanitizeFilename(file.getOriginalFilename());
        putObject(key, file);
        return key;
    }

    public String resolveObjectUrl(String keyOrUrl) {
        if (keyOrUrl == null || keyOrUrl.isBlank()) {
            return null;
        }
        if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
            return keyOrUrl;
        }
        return generatePresignedUrl(keyOrUrl);
    }

    public String generatePresignedUrl(String key) {
        GetObjectRequest objectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(presignedExpirationSeconds))
                .getObjectRequest(objectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    public void deleteObject(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build());
    }

    public List<String> allowedMimeTypes() {
        return ALLOWED_MIME_TYPES.stream().sorted().toList();
    }

    public void ensureBucketExists() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
        } catch (Exception ignored) {
            try {
                s3Client.createBucket(builder -> builder.bucket(bucketName));
            } catch (Exception duplicateIgnored) {
                // Il bucket puo' essere gia' stato creato da LocalStack init.
            }
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File obbligatorio");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Il file supera il limite massimo di 10 MB");
        }
        String contentType = normalizeContentType(file);
        if (!ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Tipo file non supportato: " + contentType);
        }
    }

    private String normalizeContentType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()) {
            return contentType.toLowerCase();
        }
        String guessed = URLConnection.guessContentTypeFromName(file.getOriginalFilename());
        return guessed != null ? guessed.toLowerCase() : "application/octet-stream";
    }

    private void putObject(String key, MultipartFile file) {
        try {
            ensureBucketExists();
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(key)
                            .contentType(normalizeContentType(file))
                            .build(),
                    RequestBody.fromBytes(file.getBytes())
            );
        } catch (IOException ex) {
            throw new IllegalArgumentException("Impossibile leggere il file caricato");
        }
    }

    private String sanitizeFilename(String filename) {
        String safe = filename == null ? "file.bin" : filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        return safe.isBlank() ? "file.bin" : safe;
    }
}
