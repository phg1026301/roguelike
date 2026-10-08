package com.roguelike.backend.run;

import com.roguelike.backend.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// 게임 한 판의 기록
@Entity
@Table(name = "game_runs", indexes = @Index(name = "idx_game_runs_score", columnList = "score"))
@Getter
@Setter
@NoArgsConstructor
public class GameRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    private int score;
    private int depth;
    private int kills;

    @Column(nullable = false, columnDefinition = "int default 0")
    private int bossKills;
    private int turns;

    @Column(length = 30)
    private String deathCause;

    // 직업: warrior / mage / archer
    @Column(length = 20)
    private String characterClass;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
