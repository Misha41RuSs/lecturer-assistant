package ru.university.analyticsservice.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record DashboardDto(
        UUID lectureId,
        long totalEvents,
        long slideChanges,
        long studentsJoined,
        Map<String, Long> eventsByType,
        List<SlideActivityDto> slideActivity
) {}