package ru.university.quizservice.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "slide_ratings")
public class SlideRating {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "slide_id", nullable = false)
    private UUID slideId;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private Integer score;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public UUID getSlideId() { return slideId; }
    public void setSlideId(UUID slideId) { this.slideId = slideId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }
    public Instant getCreatedAt() { return createdAt; }
}