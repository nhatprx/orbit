package com.orbit.whiteboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.orbit.common.ApiException;
import com.orbit.whiteboard.dto.SaveWhiteboardSceneRequest;
import com.orbit.whiteboard.dto.UpsertWhiteboardAssetRequest;
import com.orbit.whiteboard.service.WhiteboardValidation;
import com.orbit.whiteboard.service.WhiteboardValidation.ValidatedAsset;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class WhiteboardValidationTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void titleAndDescriptionRespectTrimmingAndLengthBounds() {
        assertEquals("Architecture", WhiteboardValidation.requireTitle("  Architecture  "));
        assertEquals("a".repeat(160), WhiteboardValidation.requireTitle("a".repeat(160)));
        assertThrows(ApiException.class, () -> WhiteboardValidation.requireTitle(null));
        assertThrows(ApiException.class, () -> WhiteboardValidation.requireTitle("   "));
        assertThrows(ApiException.class, () -> WhiteboardValidation.requireTitle("a".repeat(161)));

        assertEquals("", WhiteboardValidation.normalizeDescription(null));
        assertEquals("", WhiteboardValidation.normalizeDescription("   "));
        assertEquals("d".repeat(500), WhiteboardValidation.normalizeDescription("d".repeat(500)));
        assertThrows(ApiException.class, () -> WhiteboardValidation.normalizeDescription("d".repeat(501)));
    }

    @Test
    void sceneValidationChecksShapeBoundsAndTenMbLimit() {
        ObjectNode scene = WhiteboardValidation.defaultScene(mapper);
        String serialized = WhiteboardValidation.validateAndSerializeScene(
            new SaveWhiteboardSceneRequest(1L, scene, 0), mapper
        );
        assertTrue(serialized.contains("\"excalidraw\""));

        assertThrows(ApiException.class, () -> WhiteboardValidation.validateAndSerializeScene(null, mapper));
        assertThrows(
            ApiException.class,
            () -> WhiteboardValidation.validateAndSerializeScene(new SaveWhiteboardSceneRequest(0L, scene, 0), mapper)
        );
        assertThrows(
            ApiException.class,
            () -> WhiteboardValidation.validateAndSerializeScene(new SaveWhiteboardSceneRequest(1L, scene, -1), mapper)
        );
        assertThrows(
            ApiException.class,
            () -> WhiteboardValidation.validateAndSerializeScene(
                new SaveWhiteboardSceneRequest(1L, mapper.createArrayNode(), 0), mapper
            )
        );

        ObjectNode huge = mapper.createObjectNode();
        huge.put("blob", "x".repeat(WhiteboardValidation.MAX_SCENE_BYTES + 1));
        ApiException tooLarge = assertThrows(
            ApiException.class,
            () -> WhiteboardValidation.validateAndSerializeScene(new SaveWhiteboardSceneRequest(1L, huge, 1), mapper)
        );
        assertEquals(HttpStatus.BAD_REQUEST, tooLarge.getStatus());
        assertEquals("WHITEBOARD_SCENE_TOO_LARGE", tooLarge.getCode());
    }

    @Test
    void assetValidationEnforcesFileIdMimePrefixBase64AndSize() {
        String encoded = Base64.getEncoder().encodeToString("hello-image".getBytes(StandardCharsets.UTF_8));
        for (String mime : new String[] {"image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"}) {
            ValidatedAsset asset = WhiteboardValidation.validateAsset(
                "file_1-A",
                new UpsertWhiteboardAssetRequest(mime.toUpperCase(), "data:" + mime + ";base64," + encoded)
            );
            assertEquals(mime, asset.mimeType());
            assertEquals(11, asset.byteSize());
        }

        assertEquals("x".repeat(128), WhiteboardValidation.requireFileId("x".repeat(128)));
        assertThrows(ApiException.class, () -> WhiteboardValidation.requireFileId(""));
        assertThrows(ApiException.class, () -> WhiteboardValidation.requireFileId("x".repeat(129)));
        assertThrows(ApiException.class, () -> WhiteboardValidation.requireFileId("../bad"));
        assertThrows(ApiException.class, () -> WhiteboardValidation.requireFileId("bad.id"));

        assertThrows(
            ApiException.class,
            () -> WhiteboardValidation.validateAsset(
                "f1", new UpsertWhiteboardAssetRequest("text/html", "data:text/html;base64," + encoded)
            )
        );
        assertThrows(
            ApiException.class,
            () -> WhiteboardValidation.validateAsset(
                "f1", new UpsertWhiteboardAssetRequest("image/png", "https://evil.test/x.png")
            )
        );
        assertThrows(
            ApiException.class,
            () -> WhiteboardValidation.validateAsset(
                "f1", new UpsertWhiteboardAssetRequest("image/png", "data:image/jpeg;base64," + encoded)
            )
        );
        assertThrows(
            ApiException.class,
            () -> WhiteboardValidation.validateAsset(
                "f1", new UpsertWhiteboardAssetRequest("image/png", "data:image/png;base64,")
            )
        );
        assertThrows(
            ApiException.class,
            () -> WhiteboardValidation.validateAsset(
                "f1", new UpsertWhiteboardAssetRequest("image/png", "data:image/png;base64,not*valid*b64!")
            )
        );

        String oversized = "data:image/png;base64," + "A".repeat(WhiteboardValidation.MAX_ASSET_BYTES);
        ApiException tooLarge = assertThrows(
            ApiException.class,
            () -> WhiteboardValidation.validateAsset("f1", new UpsertWhiteboardAssetRequest("image/png", oversized))
        );
        assertEquals("WHITEBOARD_ASSET_TOO_LARGE", tooLarge.getCode());
    }

    @Test
    void searchPatternEscapesLikeWildcards() {
        assertNull(WhiteboardValidation.toSearchPattern(null));
        assertNull(WhiteboardValidation.toSearchPattern("   "));
        assertEquals("%100\\%\\_a\\\\b%", WhiteboardValidation.toSearchPattern("  100%_A\\b "));
    }
}
