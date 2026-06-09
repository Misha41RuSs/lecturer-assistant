package ru.university.lecturebroadcasting.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "question_upvotes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_question_upvote", columnNames = {"question_id", "chat_id"})
})
public class QuestionUpvote {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private StudentQuestionEntity question;

    @Column(name = "chat_id", nullable = false)
    private Long chatId;

    public UUID getId() { return id; }
    public StudentQuestionEntity getQuestion() { return question; }
    public void setQuestion(StudentQuestionEntity question) { this.question = question; }
    public Long getChatId() { return chatId; }
    public void setChatId(Long chatId) { this.chatId = chatId; }
}
