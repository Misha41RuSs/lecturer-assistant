package ru.university.analytics.xapi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "xapi_events")
public class XapiEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String verb; // rated, asked, answered

    @Column(nullable = false)
    private Long lectureId;

    @Column
    private Long slideId;

    @Column
    private Long chatId;

    @Column
    private Integer rating; // for rated verb

    @Column
    private String questionText; // for asked verb

    @Column
    private String quizId; // for answered verb

    @Column
    private String answer; // for answered verb

    @Column
    private Boolean isCorrect; // for answered verb

    @Column(nullable = false, columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private Instant timestamp;

    public XapiEvent() {
    }

    public XapiEvent(String verb, Long lectureId) {
        this.verb = verb;
        this.lectureId = lectureId;
        this.timestamp = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getVerb() {
        return verb;
    }

    public void setVerb(String verb) {
        this.verb = verb;
    }

    public Long getLectureId() {
        return lectureId;
    }

    public void setLectureId(Long lectureId) {
        this.lectureId = lectureId;
    }

    public Long getSlideId() {
        return slideId;
    }

    public void setSlideId(Long slideId) {
        this.slideId = slideId;
    }

    public Long getChatId() {
        return chatId;
    }

    public void setChatId(Long chatId) {
        this.chatId = chatId;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getQuestionText() {
        return questionText;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    public String getQuizId() {
        return quizId;
    }

    public void setQuizId(String quizId) {
        this.quizId = quizId;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public Boolean getIsCorrect() {
        return isCorrect;
    }

    public void setIsCorrect(Boolean isCorrect) {
        this.isCorrect = isCorrect;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
