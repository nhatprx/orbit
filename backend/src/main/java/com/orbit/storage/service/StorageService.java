package com.orbit.storage.service;

import com.orbit.storage.dto.PresignedUrlResponse;
import com.orbit.storage.dto.StorageStatusResponse;

public interface StorageService {

    StorageStatusResponse getStatus();

    PresignedUrlResponse createPresignedUploadUrl(String prefix, String filename, String contentType);

    PresignedUrlResponse createPresignedUploadUrlForKey(String objectKey, String contentType);

    PresignedUrlResponse createPresignedDownloadUrl(String key);

    String resolveObjectUrl(String key);

    void deleteObject(String key);
}
