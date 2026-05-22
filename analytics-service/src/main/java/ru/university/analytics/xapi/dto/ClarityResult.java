package ru.university.analytics.xapi.dto;

public record ClarityResult(
    Long lectureId,
    Double clarityRating,
    Double questionDensity,
    Double questionTemporalDepth
) {
}
