package com.roguelike.backend.auth;

import com.roguelike.backend.user.User;
import com.roguelike.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

// "Authorization: Bearer 토큰" 헤더로 로그인한 회원 찾기
@Service
public class AuthService {

    private final TokenService tokens;
    private final UserRepository users;

    public AuthService(TokenService tokens, UserRepository users) {
        this.tokens = tokens;
        this.users = users;
    }

    public User requireUser(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다");
        }
        Long userId = tokens.verify(authorization.substring(7));
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 만료되었습니다");
        }
        return users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원 정보가 없습니다"));
    }
}
