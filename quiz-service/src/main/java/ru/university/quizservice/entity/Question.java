package ru.university.quizservice.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lecture_id")
    private Long lectureId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType type;

    @Column(name = "time_limit_sec")
    private Integer timeLimitSec;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true,
               fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    private List<QuestionOption> options = new ArrayList<>();

    public UUID getId() { return id; }
    public Long getLectureId() { return lectureId; }
    public void setLectureId(Long lectureId) { this.lectureId = lectureId; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public QuestionType getType() { return type; }
    public void setType(QuestionType type) { this.type = type; }
    public Integer getTimeLimitSec() { return timeLimitSec; }
    public void setTimeLimitSec(Integer timeLimitSec) { this.timeLimitSec = timeLimitSec; }
    public List<QuestionOption> getOptions() { return options; }
}
