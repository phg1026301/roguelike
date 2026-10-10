package com.roguelike.backend.run;

import com.roguelike.backend.auth.AuthService;
import com.roguelike.backend.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api")
public class GameRunController {

    private final GameRunRepository runs;
    private final AuthService auth;

    public GameRunController(GameRunRepository runs, AuthService auth) {
        this.runs = runs;
        this.auth = auth;
    }

    public record SaveRunRequest(
            @Min(1) @Max(999) int depth,
            @Min(0) @Max(9999) int kills,
            @Min(0) @Max(200) Integer bossKills,
            @Min(0) @Max(1000000) int turns,
            @Size(max = 30) String deathCause,
            @Pattern(regexp = "warrior|mage|archer|summoner") String cls,
            @Pattern(regexp = "쉬움|보통|어려움|지옥") String difficulty) {
    }

    private static final java.util.Map<String, Double> SCORE_MULT = java.util.Map.of("쉬움", 0.7, "보통", 1.0, "어려움", 1.3, "지옥", 1.6);

    public record SaveRunResponse(Long id, int score, long rank) {
    }

    public record RankingEntry(long rank, String nickname, int score, int depth, int kills, String cls, String difficulty, LocalDateTime createdAt) {
    }

    public record MyRun(int score, int depth, int kills, int turns, String deathCause, String cls, LocalDateTime createdAt) {
    }

    // 게임 오버 시 점수 저장 (로그인 필요)
    @PostMapping("/runs")
    public SaveRunResponse save(@RequestHeader(value = "Authorization", required = false) String authorization,
                                @Valid @RequestBody SaveRunRequest req) {
        User user = auth.requireUser(authorization);
        GameRun run = new GameRun();
        run.setUser(user);
        run.setDepth(req.depth());
        run.setKills(req.kills());
        run.setTurns(req.turns());
        // 보스는 5층마다 1마리뿐이라 그보다 많으면 잘라낸다
        int bossKills = Math.min(req.bossKills() == null ? 0 : req.bossKills(), req.depth() / 5);
        run.setBossKills(bossKills);
        run.setDeathCause(req.deathCause());
        run.setCharacterClass(req.cls());
        String difficulty = req.difficulty() == null ? "보통" : req.difficulty();
        run.setDifficulty(difficulty);
        // 점수는 서버에서 계산 (조작 방지)
        // 난이도가 높을수록 점수가 더 잘 나온다 (프론트의 score()와 같은 배율)
        int base = req.depth() * 100 + req.kills() * 10 + bossKills * 500;
        run.setScore((int) Math.round(base * SCORE_MULT.getOrDefault(difficulty, 1.0)));
        runs.save(run);
        long rank = runs.countByScoreGreaterThan(run.getScore()) + 1;
        return new SaveRunResponse(run.getId(), run.getScore(), rank);
    }

    // 랭킹 (누구나 조회, difficulty를 주면 그 난이도만, limit은 1~100, 기본 10)
    @GetMapping("/ranking")
    public List<RankingEntry> ranking(@RequestParam(required = false) String difficulty,
                                      @RequestParam(defaultValue = "10") int limit) {
        org.springframework.data.domain.Pageable page =
                org.springframework.data.domain.PageRequest.of(0, Math.max(1, Math.min(limit, 100)));
        List<GameRun> top = difficulty != null && SCORE_MULT.containsKey(difficulty)
                ? runs.findByDifficultyOrderByScoreDescCreatedAtAsc(difficulty, page)
                : runs.findByOrderByScoreDescCreatedAtAsc(page);
        return java.util.stream.IntStream.range(0, top.size())
                .mapToObj(i -> {
                    GameRun r = top.get(i);
                    return new RankingEntry(i + 1, r.getUser().getNickname(), r.getScore(), r.getDepth(), r.getKills(), r.getCharacterClass(), r.getDifficulty(), r.getCreatedAt());
                })
                .toList();
    }

    // 내 최근 기록 (로그인 필요)
    @GetMapping("/runs/me")
    public List<MyRun> myRuns(@RequestHeader(value = "Authorization", required = false) String authorization) {
        User user = auth.requireUser(authorization);
        return runs.findTop20ByUserOrderByCreatedAtDesc(user).stream()
                .map(r -> new MyRun(r.getScore(), r.getDepth(), r.getKills(), r.getTurns(), r.getDeathCause(), r.getCharacterClass(), r.getCreatedAt()))
                .toList();
    }
}
