package com.exprivia.exhelpdesk.config;

import com.exprivia.exhelpdesk.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class S3StartupInitializer {

    private final StorageService storageService;

    public void initializeBucket() {
        storageService.ensureBucketExists();
    }
}
