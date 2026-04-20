package ru.university.quizservice.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "exam_answers")
public class ExamAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private ExamSubmission submission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private ExamQuestion question;

    /** UUID варианта ответа (для MULTIPLE-вопросов) */
    @Column(name = "selected_option_id")
    private UUID selectedOptionId;

    @Column(name = "open_text", columnDefinition = "TEXT")
    private String openText;

    /** null = не проверено ещё */
    @Column
    private Integer score;

    @Column(name = "max_score", nullable = false)
    private int maxScore = 10;

    public UUID getId() { return id; }
    public ExamSubmission getSubmission() { return submission; }
    public void setSubmission(ExamSubmission submission) { this.submission = submission; }
    public ExamQuestion getQuestion() { return question; }
    public void setQuestion(ExamQuestion question) { this.question = question; }
    public UUID getSelectedOptionId() { return selectedOptionId; }
    public void setSelectedOptionId(UUID selectedOptionId) { this.selectedOptionId = selectedOptionId; }
    public String getOpenText() { return openText; }
    public void setOpenText(String openText) { this.openText = openText; }
    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }
    public int getMaxScore() { return maxScore; }
    public void setMaxScore(int maxScore) { this.maxScore = maxScore; }
}