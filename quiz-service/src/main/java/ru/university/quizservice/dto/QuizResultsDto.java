package ru.university.quizservice.dto;

import java.util.Map;
import java.util.UUID;

public record QuizResultsDto(UUID quizId, int totalResponses, Map<String, Long> answerCounts) {}