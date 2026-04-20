package ru.university.quizservice.dto;

import java.util.List;

/** Тело запроса POST /exams */
public record CreateExamDto(
        String lectureId,
        String title,
        Integer totalTimeSec,
        String examType,
        List<QuestionDto> questions
) {
    public record QuestionDto(
            String text,
            String type,           // "MULTIPLE" | "OPEN"
            Integer timeLimitSec,
            List<OptionDto> options // только для MULTIPLE
    ) {}

    public record OptionDto(
            String text,
            boolean correct
    ) {}
}