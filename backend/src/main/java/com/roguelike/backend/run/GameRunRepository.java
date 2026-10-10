package com.roguelike.backend.run;

import com.roguelike.backend.user.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameRunRepository extends JpaRepository<GameRun, Long> {

    @EntityGraph(attributePaths = "user")
    List<GameRun> findByOrderByScoreDescCreatedAtAsc(Pageable pageable);

    @EntityGraph(attributePaths = "user")
    List<GameRun> findByDifficultyOrderByScoreDescCreatedAtAsc(String difficulty, Pageable pageable);

    List<GameRun> findTop20ByUserOrderByCreatedAtDesc(User user);

    long countByScoreGreaterThan(int score);
}
