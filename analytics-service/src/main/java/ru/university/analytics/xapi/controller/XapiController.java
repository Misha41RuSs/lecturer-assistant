package ru.university.analytics.xapi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.analytics.xapi.dto.ClarityResult;
import ru.university.analytics.xapi.dto.XapiEventRequest;
import ru.university.analytics.xapi.service.XapiEventService;

@RestController
@RequestMapping("/xapi")
public class XapiController {
    private final XapiEventService eventService;

    public XapiController(XapiEventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping("/events")
    public ResponseEntity<Void> recordEvent(@RequestBody XapiEventRequest request) {
        eventService.recordEvent(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/lectures/{lectureId}/clarity")
    public ResponseEntity<ClarityResult> getClarityMetrics(@PathVariable Long lectureId) {
        ClarityResult result = eventService.getClarityResult(lectureId);
        return ResponseEntity.ok(result);
    }
}
