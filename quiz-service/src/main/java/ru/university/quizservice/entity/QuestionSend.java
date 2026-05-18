package ru.university.quizservice.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "question_sends")
public class QuestionSend {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "lecture_id", nullable = false)
    private Long lectureId;

    @Column(name = "slide_number", nullable = false)
    private int slideNumber;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private Instant sentAt = Instant.now();

    @OneToMany(mappedBy = "questionSend", cascade = CascadeType.ALL, orphanRemoval = true,
               fetch = FetchType.LAZY)
    private List<QuestionResponse> responses = new ArrayList<>();

    public UUID getId() { return id; }
    public UUID getQuestionId() { return questionId; }
    public void setQuestionId(UUID questionId) { this.questionId = questionId; }
    public Long getLectureId() { return lectureId; }
    public void setLectureId(Long lectureId) { this.lectureId = lectureId; }
    public int getSlideNumber() { return slideNumber; }
    public void setSlideNumber(int slideNumber) { this.slideNumber = slideNumber; }
    public Instant getSentAt() { return sentAt; }
    public List<QuestionResponse> getResponses() { return responses; }
}
