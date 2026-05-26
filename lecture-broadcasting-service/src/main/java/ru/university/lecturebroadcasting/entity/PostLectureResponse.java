package ru.university.lecturebroadcasting.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "post_lecture_responses", uniqueConstraints = {
        @UniqueConstraint(name = "uk_post_lecture_response", columnNames = {"lecture_id", "chat_id"})
})
public class PostLectureResponse {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lecture_id", nullable = false)
    private Lecture lecture;

    @Column(name = "chat_id", nullable = false)
    private Long chatId;

    @Column(nullable = false)
    private Integer rating;

    @Enumerated(EnumType.STRING)
    @Column(name = "pace_signal", nullable = false)
    private PaceSignal paceSignal;

    @Column(name = "open_text", columnDefinition = "TEXT")
    private String openText;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public Lecture getLecture() { return lecture; }
    public void setLecture(Lecture lecture) { this.lecture = lecture; }
    public Long getChatId() { return chatId; }
    public void setChatId(Long chatId) { this.chatId = chatId; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public PaceSignal getPaceSignal() { return paceSignal; }
    public void setPaceSignal(PaceSignal paceSignal) { this.paceSignal = paceSignal; }
    public String getOpenText() { return openText; }
    public void setOpenText(String openText) { this.openText = openText; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
