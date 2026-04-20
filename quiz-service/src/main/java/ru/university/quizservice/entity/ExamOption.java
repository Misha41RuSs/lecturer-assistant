package ru.university.quizservice.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "exam_options")
public class ExamOption {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private ExamQuestion question;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(nullable = false)
    private boolean correct;

    public UUID getId() { return id; }
    public ExamQuestion getQuestion() { return question; }
    public void setQuestion(ExamQuestion question) { this.question = question; }
    public int getOrderIndex() { return orderIndex; }
    public void setOrderIndex(int orderIndex) { this.orderIndex = orderIndex; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public boolean isCorrect() { return correct; }
    public void setCorrect(boolean correct) { this.correct = correct; }
}