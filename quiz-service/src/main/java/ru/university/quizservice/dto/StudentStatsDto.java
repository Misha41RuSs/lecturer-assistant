package ru.university.quizservice.dto;

import java.util.List;
import java.util.UUID;

public record StudentStatsDto(
        Long chatId,
        int overallPct,
        int overallPercentile,
        List<LectureStatsDto> lectures
) {
    public record LectureStatsDto(
            Long lectureId,
            String lectureTitle,
            String date,
            List<ExamStatsDto> exams
    ) {}

    public record ExamStatsDto(
            UUID examId,
            String examTitle,
            int score,
            int maxScore,
            int pct,
            int groupPercentile,
            boolean submitted
    ) {}
}
