package ru.university.quizservice.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "exam_questions")
public class ExamQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.EAGER, optional = false,
               cascade = {jakarta.persistence.CascadeType.PERSIST, jakarta.persistence.CascadeType.MERGE})
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    public UUID getId() { return id; }
    public Exam getExam() { return exam; }
    public void setExam(Exam exam) { this.exam = exam; }
    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }
    public int getOrderIndex() { return orderIndex; }
    public void setOrderIndex(int orderIndex) { this.orderIndex = orderIndex; }
}
