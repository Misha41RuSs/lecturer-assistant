package ru.university.quizservice.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "exams")
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lecture_id", nullable = false)
    private Long lectureId;

    @Column(nullable = false)
    private String title;

    @Column(name = "total_time_sec")
    private Integer totalTimeSec;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExamStatus status = ExamStatus.DRAFT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true,
               fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    private List<ExamQuestion> questions = new ArrayList<>();

    public UUID getId() { return id; }
    public Long getLectureId() { return lectureId; }
    public void setLectureId(Long lectureId) { this.lectureId = lectureId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Integer getTotalTimeSec() { return totalTimeSec; }
    public void setTotalTimeSec(Integer totalTimeSec) { this.totalTimeSec = totalTimeSec; }
    public ExamStatus getStatus() { return status; }
    public void setStatus(ExamStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public List<ExamQuestion> getQuestions() { return questions; }
}