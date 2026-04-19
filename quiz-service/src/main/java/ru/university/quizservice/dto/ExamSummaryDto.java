package ru.university.quizservice.dto;

import java.util.UUID;

/** Краткий список тестов (GET /lectures/{id}/exams) */
public record ExamSummaryDto(
        UUID id,
        String title,
        Integer totalTimeSec,
        String status,
        String examType,
        int questionCount
) {}