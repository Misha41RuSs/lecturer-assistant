package ru.university.analytics.xapi.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.university.analytics.xapi.dto.ClarityResult;
import ru.university.analytics.xapi.dto.XapiEventRequest;
import ru.university.analytics.xapi.entity.XapiEvent;
import ru.university.analytics.xapi.repository.XapiEventRepository;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class XapiEventServiceTest {
    @Mock
    private XapiEventRepository repository;

    @Mock
    private ClarityMetricsService metricsService;

    private XapiEventService service;

    @BeforeEach
    void setUp() {
        service = new XapiEventService(repository, metricsService);
    }

    @Test
    void testCalculateClarityRating() {
        Long lectureId = 1L;

        // Create rated events: 2, 4, 5
        XapiEvent event1 = new XapiEvent("rated", lectureId);
        event1.setRating(2);

        XapiEvent event2 = new XapiEvent("rated", lectureId);
        event2.setRating(4);

        XapiEvent event3 = new XapiEvent("rated", lectureId);
        event3.setRating(5);

        List<XapiEvent> events = Arrays.asList(event1, event2, event3);

        when(repository.findByLectureId(lectureId)).thenReturn(events);
        when(repository.findDistinctSlideIdsByLectureId(lectureId)).thenReturn(List.of(1L, 2L));
        when(repository.findDistinctChatIdsByLectureId(lectureId)).thenReturn(List.of(10L, 20L));

        ClarityResult result = service.getClarityResult(lectureId);

        // Expected: CR = (2 + 4 + 5) / 3 = 3.67
        assertEquals(3.67, result.clarityRating(), 0.01);
        assertEquals(0.0, result.questionDensity()); // No asked events
        assertEquals(0.0, result.questionTemporalDepth()); // MVP

        verify(repository).findByLectureId(lectureId);
    }

    @Test
    void testCalculateQuestionDensity() {
        Long lectureId = 1L;

        // Create asked events
        XapiEvent asked1 = new XapiEvent("asked", lectureId);
        asked1.setSlideId(1L);
        asked1.setChatId(10L);

        XapiEvent asked2 = new XapiEvent("asked", lectureId);
        asked2.setSlideId(2L);
        asked2.setChatId(20L);

        List<XapiEvent> events = Arrays.asList(asked1, asked2);

        when(repository.findByLectureId(lectureId)).thenReturn(events);
        when(repository.findDistinctSlideIdsByLectureId(lectureId)).thenReturn(List.of(1L, 2L));
        when(repository.findDistinctChatIdsByLectureId(lectureId)).thenReturn(List.of(10L, 20L));

        ClarityResult result = service.getClarityResult(lectureId);

        // Expected: QD = 2 / (2 slides * 2 students) = 0.5
        assertEquals(0.5, result.questionDensity());

        verify(repository).findByLectureId(lectureId);
    }

    @Test
    void testRecordEvent() {
        XapiEventRequest request = new XapiEventRequest(
            "rated",
            1L,
            1L,
            10L,
            4,
            null,
            null,
            null,
            null
        );

        when(repository.save(any(XapiEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        service.recordEvent(request);

        verify(repository).save(any(XapiEvent.class));
        verify(metricsService).updateMetrics(1L);
    }
}
