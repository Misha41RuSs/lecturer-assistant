package ru.university.quizservice.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "slide_questions")
public class SlideQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lecture_id", nullable = false)
    private UUID lectureId;

    @Column(name = "slide_id")
    private UUID slideId;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column(name = "is_answered", nullable = false)
    private boolean answered = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public UUID getLectureId() { return lectureId; }
    public void setLectureId(UUID lectureId) { this.lectureId = lectureId; }
    public UUID getSlideId() { return slideId; }
    public void setSlideId(UUID slideId) { this.slideId = slideId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }
    public boolean isAnswered() { return answered; }
    public void setAnswered(boolean answered) { this.answered = answered; }
    public Instant getCreatedAt() { return createdAt; }
}