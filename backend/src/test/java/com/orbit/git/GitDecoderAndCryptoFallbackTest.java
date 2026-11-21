package com.orbit.git;

import static org.junit.jupiter.api.Assertions.*;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.common.ApiException;
import com.orbit.git.client.GitHubApiParser;
import com.orbit.git.client.GitHubFileContentDecoder;
import com.orbit.git.config.GitProperties;
import com.orbit.git.dto.GitFileContentDto;
import com.orbit.git.service.GitTokenCrypto;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;

class GitDecoderAndCryptoFallbackTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final GitHubApiParser parser = new GitHubApiParser();

    @Test
    void parserRejectsLargeFilesNonBase64AndMalformedBase64Gracefully() throws Exception {
        var oversizeJson = mapper.readTree("""
            {"path":"big.bin","name":"big.bin","sha":"s1","size":2097152,"encoding":"base64","content":""}
            """);
        ApiException tooLarge = assertThrows(ApiException.class, () -> parser.parseFileContent(oversizeJson, "main"));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, tooLarge.getStatus());
        assertEquals("GIT_FILE_TOO_LARGE", tooLarge.getCode());

        var noneEncoding = mapper.readTree("""
            {"path":"huge.json","name":"huge.json","sha":"s2","size":500,"encoding":"none","content":""}
            """);
        ApiException noneEx = assertThrows(ApiException.class, () -> parser.parseFileContent(noneEncoding, "main"));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, noneEx.getStatus());
        assertEquals("GIT_FILE_TOO_LARGE", noneEx.getCode());

        var unsupportedEnc = mapper.readTree("""
            {"path":"doc.txt","name":"doc.txt","sha":"s3","size":10,"encoding":"utf-16","content":"abc"}
            """);
        ApiException encEx = assertThrows(ApiException.class, () -> parser.parseFileContent(unsupportedEnc, "main"));
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, encEx.getStatus());
        assertEquals("GIT_FILE_UNSUPPORTED_ENCODING", encEx.getCode());

        var corruptBase64 = mapper.readTree("""
            {"path":"bad.txt","name":"bad.txt","sha":"s4","size":10,"encoding":"base64","content":"!!!not_base64!!!"}
            """);
        ApiException badB64 = assertThrows(ApiException.class, () -> parser.parseFileContent(corruptBase64, "main"));
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, badB64.getStatus());
        assertEquals("GIT_FILE_DECODE_FAILED", badB64.getCode());

        byte[] overLimitBytes = new byte[(int) GitHubFileContentDecoder.MAX_INLINE_FILE_BYTES + 16];
        String hugeEncoded = Base64.getEncoder().encodeToString(overLimitBytes);
        var unstatedSize = mapper.readTree("""
            {"path":"sneaky.txt","name":"sneaky.txt","sha":"s5","encoding":"base64","content":"%s"}
            """.formatted(hugeEncoded));
        ApiException decodedLarge = assertThrows(ApiException.class, () -> parser.parseFileContent(unstatedSize, "main"));
        assertEquals("GIT_FILE_TOO_LARGE", decodedLarge.getCode());

        var emptyFile = mapper.readTree("""
            {"path":"empty.txt","name":"empty.txt","sha":"s6","size":0,"encoding":"base64","content":""}
            """);
        GitFileContentDto okEmpty = parser.parseFileContent(emptyFile, "main");
        assertEquals("", okEmpty.content());
    }

    @Test
    void tokenCryptoLogsWarnOnceWhenFallingBackToJwtSecret() {
        Logger logger = (Logger) LoggerFactory.getLogger(GitTokenCrypto.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            GitProperties fallbackProps = new GitProperties();
            fallbackProps.setEncryptionSecret("");
            fallbackProps.setFallbackJwtSecret("jwt-fallback-secret-2026");
            assertTrue(fallbackProps.isUsingJwtFallback());

            GitTokenCrypto crypto = new GitTokenCrypto(fallbackProps);
            String cipher1 = crypto.encrypt("ghp_fallback12345");
            String cipher2 = crypto.encrypt("ghp_fallback67890");
            assertEquals("ghp_fallback12345", crypto.decrypt(cipher1));
            assertEquals("ghp_fallback67890", crypto.decrypt(cipher2));

            long warnCount = appender.list.stream()
                .filter(ev -> ev.getLevel() == Level.WARN && ev.getFormattedMessage().contains("orbit.git.encryption-secret"))
                .count();
            assertEquals(1, warnCount);

            appender.list.clear();
            GitProperties dedicatedProps = new GitProperties();
            dedicatedProps.setEncryptionSecret("dedicated-git-secret-2026");
            assertFalse(dedicatedProps.isUsingJwtFallback());
            GitTokenCrypto dedicatedCrypto = new GitTokenCrypto(dedicatedProps);
            assertEquals("ghp_direct9999", dedicatedCrypto.decrypt(dedicatedCrypto.encrypt("ghp_direct9999")));
            assertEquals(0, appender.list.size());

            GitProperties emptyProps = new GitProperties();
            emptyProps.setEncryptionSecret(" ");
            emptyProps.setFallbackJwtSecret(" ");
            GitTokenCrypto brokenCrypto = new GitTokenCrypto(emptyProps);
            assertThrows(IllegalStateException.class, () -> brokenCrypto.encrypt("ghp_fail"));
        } finally {
            logger.detachAppender(appender);
        }
    }
}
