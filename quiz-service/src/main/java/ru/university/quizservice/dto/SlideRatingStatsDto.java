package ru.university.quizservice.dto;

import java.util.UUID;

public record SlideRatingStatsDto(UUID slideId, int totalRatings, double averageScore) {}