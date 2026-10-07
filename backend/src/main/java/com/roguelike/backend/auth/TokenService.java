package com.roguelike.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

// 로그인 토큰(JWT, HS256) 발급과 검증
@Service
public class TokenService {

    private static final long VALID_SECONDS = 60L * 60 * 24 * 7; // 7일
    private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DEC = Base64.getUrlDecoder();

    private final byte[] secret;

    public TokenService(@Value("${jwt.secret}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String issue(Long userId) {
        String header = ENC.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        long exp = Instant.now().getEpochSecond() + VALID_SECONDS;
        String payload = ENC.encodeToString(("{\"sub\":\"" + userId + "\",\"exp\":" + exp + "}").getBytes(StandardCharsets.UTF_8));
        return header + "." + payload + "." + sign(header + "." + payload);
    }

    // 유효하면 userId, 아니면 null
    public Long verify(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;
            byte[] expected = sign(parts[0] + "." + parts[1]).getBytes(StandardCharsets.UTF_8);
            if (!MessageDigest.isEqual(expected, parts[2].getBytes(StandardCharsets.UTF_8))) return null;
            String json = new String(DEC.decode(parts[1]), StandardCharsets.UTF_8);
            long exp = Long.parseLong(json.replaceAll(".*\"exp\":(\\d+).*", "$1"));
            if (exp < Instant.now().getEpochSecond()) return null;
            return Long.parseLong(json.replaceAll(".*\"sub\":\"(\\d+)\".*", "$1"));
        } catch (Exception e) {
            return null;
        }
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return ENC.encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
