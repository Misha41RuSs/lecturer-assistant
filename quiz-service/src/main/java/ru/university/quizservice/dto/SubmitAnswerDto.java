package ru.university.quizservice.dto;

/** Тело запроса POST /submissions/{id}/answers */
public record SubmitAnswerDto(
        String questionId,
        String selectedOptionId, // для MULTIPLE
        String openText          // для OPEN
) {}