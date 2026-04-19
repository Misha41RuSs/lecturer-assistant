package ru.university.analyticsservice.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.university.analyticsservice.dto.DashboardDto;
import ru.university.analyticsservice.dto.SlideActivityDto;
import ru.university.analyticsservice.entity.ActivityLog;
import ru.university.analyticsservice.repository.ActivityLogRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final ActivityLogRepository logRepository;

    public AnalyticsService(ActivityLogRepository logRepository) {
        this.logRepository = logRepository;
    }

    @Transactional
    public ActivityLog recordEvent(Long lectureId, Long userId, String actionType, String payload) {
        ActivityLog log = new ActivityLog();
        log.setLectureId(lectureId);
        log.setUserId(userId);
        log.setActionType(actionType);
        log.setPayload(payload);
        return logRepository.save(log);
    }

    public DashboardDto getDashboard(Long lectureId) {
        List<ActivityLog> logs = logRepository.findByLectureIdOrderByTimestampAsc(lectureId);

        Map<String, Long> byType = logs.stream()
                .collect(Collectors.groupingBy(ActivityLog::getActionType, Collectors.counting()));

        long slideChanges = byType.getOrDefault("slide_changed", 0L);
        long studentsJoined = byType.getOrDefault("student_joined", 0L);

        Map<String, Long> slideEvents = logs.stream()
                .filter(l -> l.getPayload() != null && l.getPayload().matches(".*\"slideNumber\":\\s*\\d+.*"))
                .collect(Collectors.groupingBy(l -> extractSlideNumber(l.getPayload()), Collectors.counting()));

        List<SlideActivityDto> slideActivity = slideEvents.entrySet().stream()
                .filter(e -> !e.getKey().isEmpty())
                .map(e -> new SlideActivityDto(Integer.parseInt(e.getKey()), e.getValue()))
                .sorted(Comparator.comparingInt(SlideActivityDto::slideNumber))
                .toList();

        return new DashboardDto(lectureId, logs.size(), slideChanges, studentsJoined, byType, slideActivity);
    }

    public Map<String, Object> getAggregations(Long lectureId) {
        List<ActivityLog> logs = logRepository.findByLectureIdOrderByTimestampAsc(lectureId);
        Map<String, Long> byType = logs.stream()
                .collect(Collectors.groupingBy(ActivityLog::getActionType, Collectors.counting()));
        return Map.of(
                "lectureId", lectureId,
                "totalEvents", logs.size(),
                "byType", byType
        );
    }

    public Map<String, Object> getReport(Long lectureId) {
        DashboardDto dashboard = getDashboard(lectureId);
        return Map.of(
                "lectureId", lectureId,
                "totalEvents", dashboard.totalEvents(),
                "slideChanges", dashboard.slideChanges(),
                "studentsJoined", dashboard.studentsJoined(),
                "eventsByType", dashboard.eventsByType(),
                "slideActivity", dashboard.slideActivity()
        );
    }

    private String extractSlideNumber(String payload) {
        if (payload == null) return "";
        var m = java.util.regex.Pattern.compile("\"slideNumber\":\\s*(\\d+)").matcher(payload);
        return m.find() ? m.group(1) : "";
    }
}