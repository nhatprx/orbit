package com.orbit.ai.gateway;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import software.amazon.awssdk.core.document.Document;

final class BedrockDocumentMapper {

    private BedrockDocumentMapper() {}

    static Document toDocument(Object value) {
        if (value == null) return Document.fromNull();
        if (value instanceof String s) return Document.fromString(s);
        if (value instanceof Boolean b) return Document.fromBoolean(b);
        if (value instanceof Integer i) return Document.fromNumber(i);
        if (value instanceof Long l) return Document.fromNumber(l);
        if (value instanceof Double d) return Document.fromNumber(d);
        if (value instanceof Number n) return Document.fromNumber(n.doubleValue());
        if (value instanceof List<?> list) {
            List<Document> docs = new ArrayList<>(list.size());
            for (Object item : list) docs.add(toDocument(item));
            return Document.fromList(docs);
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Document> docMap = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                docMap.put(String.valueOf(entry.getKey()), toDocument(entry.getValue()));
            }
            return Document.fromMap(docMap);
        }
        return Document.fromString(String.valueOf(value));
    }

    static Map<String, Object> toMap(Document doc) {
        if (doc == null || !doc.isMap()) return Map.of();
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<String, Document> entry : doc.asMap().entrySet()) {
            result.put(entry.getKey(), fromDocument(entry.getValue()));
        }
        return result;
    }

    private static Object fromDocument(Document doc) {
        if (doc == null || doc.isNull()) return null;
        if (doc.isString()) return doc.asString();
        if (doc.isBoolean()) return doc.asBoolean();
        if (doc.isNumber()) return doc.asNumber().doubleValue();
        if (doc.isList()) {
            List<Object> items = new ArrayList<>();
            for (Document item : doc.asList()) items.add(fromDocument(item));
            return items;
        }
        if (doc.isMap()) return toMap(doc);
        return doc.toString();
    }
}
