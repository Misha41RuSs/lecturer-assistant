package ru.university.quizservice.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "question_responses")
public class QuestionResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_send_id", nullable = false)
    private QuestionSend questionSend;

    @Column(name = "chat_id", nullable = false)
    private Long chatId;

    /** UUID выбранного варианта (для MULTIPLE) */
    @Column(name = "selected_option_id")
    private UUID selectedOptionId;

    @Column(name = "open_text", columnDefinition = "TEXT")
    private String openText;

    /** null = OPEN-вопрос без автопроверки, true/false = результат MULTIPLE */
    @Column
    private Boolean correct;

    @Column(name = "answered_at", nullable = false, updatable = false)
    private Instant answeredAt = Instant.now();

    public UUID getId() { return id; }
    public QuestionSend getQuestionSend() { return questionSend; }
    public void setQuestionSend(QuestionSend questionSend) { this.questionSend = questionSend; }
    public Long getChatId() { return chatId; }
    public void setChatId(Long chatId) { this.chatId = chatId; }
    public UUID getSelectedOptionId() { return selectedOptionId; }
    public void setSelectedOptionId(UUID selectedOptionId) { this.selectedOptionId = selectedOptionId; }
    public String getOpenText() { return openText; }
    public void setOpenText(String openText) { this.openText = openText; }
    public Boolean getCorrect() { return correct; }
    public void setCorrect(Boolean correct) { this.correct = correct; }
    public Instant getAnsweredAt() { return answeredAt; }
}
