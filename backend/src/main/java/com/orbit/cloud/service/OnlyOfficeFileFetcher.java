package com.orbit.cloud.service;

import com.orbit.common.ApiException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Downloads edited document bytes from ONLYOFFICE Document Server with strict size bounds. */
@Component
public class OnlyOfficeFileFetcher {

    private static final int BUFFER_SIZE = 8192;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build();

    public byte[] fetch(String url, long maxBytes) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(60))
                .GET()
                .build();
            HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "ONLYOFFICE_FETCH_FAILED",
                    "ONLYOFFICE document download returned HTTP " + response.statusCode() + "."
                );
            }
            try (InputStream in = response.body()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[BUFFER_SIZE];
                long total = 0L;
                int read;
                while ((read = in.read(buffer)) != -1) {
                    total += read;
                    if (total > maxBytes) {
                        throw new ApiException(
                            HttpStatus.PAYLOAD_TOO_LARGE,
                            "FILE_TOO_LARGE",
                            "Edited file exceeds maximum allowed size."
                        );
                    }
                    out.write(buffer, 0, read);
                }
                return out.toByteArray();
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.BAD_GATEWAY, "ONLYOFFICE_FETCH_FAILED", "Interrupted downloading file.");
        } catch (IOException | IllegalArgumentException ex) {
            throw new ApiException(
                HttpStatus.BAD_GATEWAY,
                "ONLYOFFICE_FETCH_FAILED",
                "Failed to download edited document from ONLYOFFICE."
            );
        }
    }
}
