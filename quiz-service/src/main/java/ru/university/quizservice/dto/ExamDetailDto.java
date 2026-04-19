package ru.university.quizservice.dto;

import java.util.List;
import java.util.UUID;

/** Полное описание теста (для фронта и бота) */
public record ExamDetailDto(
        UUID id,
        Long lectureId,
        String title,
        Integer totalTimeSec,
        String status,
        String examType,
        List<QuestionDto> questions
) {
    public record QuestionDto(
            UUID id,
            int orderIndex,
            String text,
            String type,
            Integer timeLimitSec,
            List<OptionDto> options
    ) {}

    public record OptionDto(
            UUID id,
            String text
    ) {}
}