package ru.university.analytics.xapi.dto;

public record XapiEventRequest(
    String verb,
    Long lectureId,
    Long slideId,
    Long chatId,
    Integer rating,
    String questionText,
    String quizId,
    String answer,
    Boolean isCorrect
) {
}
