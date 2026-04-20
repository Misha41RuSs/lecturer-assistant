package ru.university.analyticsservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.analyticsservice.dto.DashboardDto;
import ru.university.analyticsservice.entity.ActivityLog;
import ru.university.analyticsservice.service.AnalyticsService;

import java.util.Map;

@RestController
@RequestMapping("/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    /** Системные события от lecture-broadcasting-service (смена слайда, старт/стоп) */
    @PostMapping("/events/lecture")
    public ResponseEntity<ActivityLog> lectureEvent(@RequestBody Map<String, String> body) {
        Long lectureId = Long.parseLong(body.get("lectureId"));
        String actionType = body.get("actionType");
        String payload = body.get("payload");
        return ResponseEntity.ok(analyticsService.recordEvent(lectureId, null, actionType, payload));
    }

    /** Пользовательские события (студент присоединился, ответил, потерял фокус) */
    @PostMapping("/events/user")
    public ResponseEntity<ActivityLog> userEvent(@RequestBody Map<String, String> body) {
        Long lectureId = Long.parseLong(body.get("lectureId"));
        Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId")) : null;
        String actionType = body.get("actionType");
        String payload = body.get("payload");
        return ResponseEntity.ok(analyticsService.recordEvent(lectureId, userId, actionType, payload));
    }

    /** Агрегированные метрики для лекции */
    @GetMapping("/lectures/{lectureId}/aggregations")
    public ResponseEntity<Map<String, Object>> aggregations(@PathVariable Long lectureId) {
        return ResponseEntity.ok(analyticsService.getAggregations(lectureId));
    }

    /** Дашборд для реал-тайм отображения на фронте */
    @GetMapping("/lectures/{lectureId}/dashboard")
    public ResponseEntity<DashboardDto> dashboard(@PathVariable Long lectureId) {
        return ResponseEntity.ok(analyticsService.getDashboard(lectureId));
    }

    /** Итоговый отчёт после завершения лекции */
    @GetMapping("/lectures/{lectureId}/report")
    public ResponseEntity<Map<String, Object>> report(@PathVariable Long lectureId) {
        return ResponseEntity.ok(analyticsService.getReport(lectureId));
    }
}