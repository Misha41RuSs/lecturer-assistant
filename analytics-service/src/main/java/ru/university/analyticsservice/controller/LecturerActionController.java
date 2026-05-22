package ru.university.analyticsservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.analyticsservice.metrics.ActionType;
import ru.university.analyticsservice.metrics.LecturerActionMetrics;

import java.util.Map;

@RestController
public class LecturerActionController {

    private final LecturerActionMetrics metrics;

    public LecturerActionController(LecturerActionMetrics metrics) {
        this.metrics = metrics;
    }

    @PostMapping("/internal/actions")
    public ResponseEntity<Void> record(@RequestBody RecordRequest req) {
        metrics.recordAction(req.type(), req.lectureId());
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/api/lectures/{lectureId}/actions")
    public ResponseEntity<ActionsResponse> getActions(
            @PathVariable String lectureId,
            @RequestParam(defaultValue = "5") int windowMinutes) {

        Map<ActionType, Double> rate = metrics.getActionsPerMinute(lectureId, windowMinutes);
        Map<ActionType, Long> total = metrics.getTotals(lectureId);
        return ResponseEntity.ok(new ActionsResponse(lectureId, windowMinutes, rate, total));
    }

    public record RecordRequest(ActionType type, String lectureId) {}

    public record ActionsResponse(
            String lectureId,
            int windowMinutes,
            Map<ActionType, Double> actionsPerMinute,
            Map<ActionType, Long> totals
    ) {}
}
