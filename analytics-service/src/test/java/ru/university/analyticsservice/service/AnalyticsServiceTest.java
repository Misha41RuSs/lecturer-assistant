package ru.university.analyticsservice.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import ru.university.analyticsservice.entity.ActivityLog;
import ru.university.analyticsservice.repository.ActivityLogRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class AnalyticsServiceTest {

    private ActivityLogRepository logRepository;
    private SimpleMeterRegistry meterRegistry;
    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        logRepository = Mockito.mock(ActivityLogRepository.class);
        meterRegistry = new SimpleMeterRegistry();
        analyticsService = new AnalyticsService(logRepository, meterRegistry);
    }

    @Test
    void recordEvent_shouldIncrementCounterWithTags() {
        ActivityLog log = new ActivityLog();
        log.setLectureId(42L);
        log.setUserId(100L);
        log.setActionType("slide_changed");
        log.setPayload("{\"slideNumber\":2}");

        when(logRepository.save(any(ActivityLog.class))).thenReturn(log);

        ActivityLog savedLog = analyticsService.recordEvent(42L, 100L, "slide_changed", "{\"slideNumber\":2}");

        assertNotNull(savedLog);
        assertEquals(42L, savedLog.getLectureId());
        assertEquals(100L, savedLog.getUserId());
        assertEquals("slide_changed", savedLog.getActionType());

        Counter counter = meterRegistry.find("user.action.count")
                .tag("lecture_id", "42")
                .tag("user_id", "100")
                .tag("action_type", "slide_changed")
                .counter();

        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void recordEvent_withNullValues_shouldUseDefaultTags() {
        ActivityLog log = new ActivityLog();
        when(logRepository.save(any(ActivityLog.class))).thenReturn(log);

        analyticsService.recordEvent(null, null, null, null);

        Counter counter = meterRegistry.find("user.action.count")
                .tag("lecture_id", "unknown")
                .tag("user_id", "unknown")
                .tag("action_type", "unknown")
                .counter();

        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }
}
