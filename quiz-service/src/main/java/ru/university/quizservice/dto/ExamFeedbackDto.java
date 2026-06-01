package ru.university.quizservice.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ExamFeedbackDto(
        UUID examId,
        Long lectureId,
        String examTitle,
        Instant releasedAt,
        List<StudentFeedbackDto> students
) {
    public record StudentFeedbackDto(
            Long chatId,
            int totalCorrect,
            int totalQuestions,
            int percent,
            int percentile,
            List<QuestionFeedbackDto> questions
    ) {}

    public record QuestionFeedbackDto(
            int orderIndex,
            String questionText,
            String answerText,
            Boolean correct,
            Integer wrongPct
    ) {}
}
