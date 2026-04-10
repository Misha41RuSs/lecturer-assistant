package ru.university.quizservice.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Результат одного студента (GET /exams/{id}/submissions) */
public record SubmissionResultDto(
        UUID submissionId,
        Long chatId,
        Instant startedAt,
        Instant completedAt,
        int totalScore,
        int maxScore,
        boolean hasUngraded,
        List<AnswerDto> answers
) {
    public record AnswerDto(
            UUID answerId,
            UUID questionId,
            String questionText,
            String questionType,
            UUID selectedOptionId,
            String selectedOptionText,
            String openText,
            Integer score,
            int maxScore,
            Boolean correct  // null для OPEN, true/false для MULTIPLE
    ) {}
}