package ru.university.lecturebroadcasting.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "comprehension_signals", uniqueConstraints = {
        @UniqueConstraint(name = "uk_comprehension_signal", columnNames = {"lecture_id", "chat_id", "slide_index"})
})
public class ComprehensionSignal {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lecture_id", nullable = false)
    private Lecture lecture;

    @Column(name = "chat_id", nullable = false)
    private Long chatId;

    @Column(name = "slide_index", nullable = false)
    private Integer slideIndex;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComprehensionSignalValue signal;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public Lecture getLecture() { return lecture; }
    public void setLecture(Lecture lecture) { this.lecture = lecture; }
    public Long getChatId() { return chatId; }
    public void setChatId(Long chatId) { this.chatId = chatId; }
    public Integer getSlideIndex() { return slideIndex; }
    public void setSlideIndex(Integer slideIndex) { this.slideIndex = slideIndex; }
    public ComprehensionSignalValue getSignal() { return signal; }
    public void setSignal(ComprehensionSignalValue signal) { this.signal = signal; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
