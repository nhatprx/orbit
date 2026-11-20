package com.orbit.storage.service;

import java.time.Instant;

public interface CloudDownloadSigner {

    record SignedDownloadUrl(String url, Instant expiresAt, String provider) {}

    SignedDownloadUrl signDownload(String storageKey, String filename, String mimeType);
}
