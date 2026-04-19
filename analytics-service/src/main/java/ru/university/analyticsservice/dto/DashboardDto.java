package ru.university.analyticsservice.dto;

import java.util.List;
import java.util.Map;

public record DashboardDto(
        Long lectureId,
        long totalEvents,
        long slideChanges,
        long studentsJoined,
        Map<String, Long> eventsByType,
        List<SlideActivityDto> slideActivity,
        List<Long> studentIds
) {}