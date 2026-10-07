package com.roguelike.backend.auth;

import com.roguelike.backend.user.User;
import com.roguelike.backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

// 카카오 로그인: 인가 코드 → 카카오 토큰 → 사용자 정보 → 우리 회원 + 우리 토큰
@RestController
@RequestMapping("/api/auth")
public class KakaoAuthController {

    private final String clientId;
    private final String clientSecret;
    private final UserRepository users;
    private final TokenService tokens;
    private final AuthService auth;
    private final RestClient http = RestClient.create();

    public KakaoAuthController(@Value("${kakao.client-id}") String clientId,
                               @Value("${kakao.client-secret}") String clientSecret,
                               UserRepository users, TokenService tokens, AuthService auth) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.users = users;
        this.tokens = tokens;
        this.auth = auth;
    }

    public record LoginUrlResponse(String url) {
    }

    public record KakaoLoginRequest(String code, String redirectUri) {
    }

    public record LoginResponse(String token, String nickname) {
    }

    public record MeResponse(String nickname) {
    }

    // 프론트가 이동할 카카오 로그인 페이지 주소
    @GetMapping("/kakao/login-url")
    public LoginUrlResponse loginUrl(@RequestParam String redirectUri) {
        if (clientId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "KAKAO_CLIENT_ID가 설정되지 않았습니다");
        }
        String url = UriComponentsBuilder.fromUriString("https://kauth.kakao.com/oauth/authorize")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .encode()
                .toUriString();
        return new LoginUrlResponse(url);
    }

    @PostMapping("/kakao")
    @SuppressWarnings("unchecked")
    public LoginResponse kakaoLogin(@RequestBody KakaoLoginRequest req) {
        // 1) 인가 코드를 카카오 액세스 토큰으로 교환
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", clientId);
        form.add("redirect_uri", req.redirectUri());
        form.add("code", req.code());
        if (!clientSecret.isBlank()) form.add("client_secret", clientSecret);

        Map<String, Object> tokenRes;
        try {
            tokenRes = http.post()
                    .uri("https://kauth.kakao.com/oauth/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "카카오 토큰 발급 실패: " + e.getMessage());
        }
        String kakaoAccessToken = (String) tokenRes.get("access_token");

        // 2) 카카오 사용자 정보 조회
        Map<String, Object> me = http.get()
                .uri("https://kapi.kakao.com/v2/user/me")
                .header("Authorization", "Bearer " + kakaoAccessToken)
                .retrieve()
                .body(Map.class);
        Long kakaoId = ((Number) me.get("id")).longValue();
        String nickname = extractNickname(me);

        // 3) 처음이면 가입, 이미 있으면 닉네임만 최신으로
        User user = users.findByKakaoId(kakaoId).orElseGet(() -> new User(kakaoId, nickname));
        user.setNickname(nickname);
        users.save(user);

        return new LoginResponse(tokens.issue(user.getId()), user.getNickname());
    }

    @GetMapping("/me")
    public MeResponse me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return new MeResponse(auth.requireUser(authorization).getNickname());
    }

    @SuppressWarnings("unchecked")
    private String extractNickname(Map<String, Object> me) {
        try {
            Map<String, Object> account = (Map<String, Object>) me.get("kakao_account");
            Map<String, Object> profile = (Map<String, Object>) account.get("profile");
            String n = (String) profile.get("nickname");
            if (n != null && !n.isBlank()) return n.length() > 50 ? n.substring(0, 50) : n;
        } catch (Exception ignored) {
        }
        try {
            Map<String, Object> props = (Map<String, Object>) me.get("properties");
            String n = (String) props.get("nickname");
            if (n != null && !n.isBlank()) return n.length() > 50 ? n.substring(0, 50) : n;
        } catch (Exception ignored) {
        }
        return "모험가" + String.valueOf(me.get("id")).substring(Math.max(0, String.valueOf(me.get("id")).length() - 4));
    }
}
