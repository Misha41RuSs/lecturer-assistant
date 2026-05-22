package ru.university.analyticsservice.xapi.dto;

public record ClarityResult(
    Long lectureId,
    Double clarityRating,
    Double questionDensity,
    Double questionTemporalDepth
) {
}
