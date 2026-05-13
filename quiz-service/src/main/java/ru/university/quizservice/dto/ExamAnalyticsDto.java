package ru.university.quizservice.dto;

import java.util.List;
import java.util.UUID;

/**
 * Аналитика по тесту: статистика по вопросам и студентам.
 * GET /exams/{examId}/analytics
 */
public record ExamAnalyticsDto(
        UUID examId,
        String examTitle,
        int totalSubmissions,
        List<QuestionStatDto> questionStats,
        List<StudentStatDto> studentStats
) {

    /** Статистика по одному вопросу */
    public record QuestionStatDto(
            UUID questionId,
            int orderIndex,
            String questionText,
            String questionType,       // MULTIPLE | OPEN
            int totalAnswers,          // сколько студентов ответили на этот вопрос
            int correctAnswers,        // только для MULTIPLE
            int correctPct,            // 0-100, только для MULTIPLE
            List<OptionStatDto> optionStats  // распределение по вариантам (только MULTIPLE)
    ) {}

    /** Статистика по одному варианту ответа */
    public record OptionStatDto(
            UUID optionId,
            String optionText,
            boolean correct,
            int chosenCount,
            int chosenPct            // % от totalAnswers
    ) {}

    /** Статистика по одному студенту */
    public record StudentStatDto(
            long chatId,
            int totalScore,
            int maxScore,
            int correctPct,          // % правильных (от MULTIPLE-вопросов)
            int correctAnswers,      // кол-во правильных MULTIPLE
            int totalMultiple,       // всего MULTIPLE-вопросов в ответах студента
            boolean hasUngraded
    ) {}
}
