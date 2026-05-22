package ru.university.analyticsservice.xapi.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.university.analyticsservice.xapi.dto.ClarityResult;
import ru.university.analyticsservice.xapi.dto.XapiEventRequest;
import ru.university.analyticsservice.xapi.entity.XapiEvent;
import ru.university.analyticsservice.xapi.repository.XapiEventRepository;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class XapiEventServiceTest {
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
    void recordEvent_savesEventToRepository() {
        XapiEventRequest request = new XapiEventRequest(
            "rated", 1L, 5L, 123456789L, 4, null, null, null, null
        );

        service.recordEvent(request);

        verify(repository).save(any(XapiEvent.class));
    }

    @Test
    void recordEvent_savesEventWithCorrectVerbAndLectureId() {
        XapiEventRequest request = new XapiEventRequest(
            "rated", 1L, 5L, 123456789L, 4, null, null, null, null
        );

        service.recordEvent(request);

        verify(repository).save(any(XapiEvent.class));
        verify(metricsService).updateMetrics(1L);
    }

    @Test
    void recordEvent_triggersMetricsUpdate() {
        XapiEventRequest request = new XapiEventRequest(
            "asked", 2L, 10L, 987654321L, null, "Что это?", null, null, null
        );

        service.recordEvent(request);

        verify(metricsService).updateMetrics(2L);
    }

    @Test
    void getClarityResult_calculatesAverageRating() {
        Long lectureId = 1L;
        XapiEvent event1 = createRatedEvent(lectureId, 1L, 3);
        XapiEvent event2 = createRatedEvent(lectureId, 2L, 4);
        XapiEvent event3 = createRatedEvent(lectureId, 3L, 5);

        when(repository.findByLectureId(lectureId)).thenReturn(Arrays.asList(event1, event2, event3));
        when(repository.findDistinctSlideIdsByLectureId(lectureId)).thenReturn(Arrays.asList(1L, 2L, 3L));
        when(repository.findDistinctChatIdsByLectureId(lectureId)).thenReturn(Arrays.asList(100L, 200L));

        ClarityResult result = service.getClarityResult(lectureId);

        assertThat(result.clarityRating()).isEqualTo(4.0);
    }

    @Test
    void getClarityResult_noRatedEvents_returnsZeroClarityRating() {
        Long lectureId = 1L;
        XapiEvent event1 = createAskedEvent(lectureId, 1L, "Вопрос?");
        XapiEvent event2 = createAskedEvent(lectureId, 2L, "Ещё вопрос?");

        when(repository.findByLectureId(lectureId)).thenReturn(Arrays.asList(event1, event2));
        when(repository.findDistinctSlideIdsByLectureId(lectureId)).thenReturn(Arrays.asList(1L, 2L));
        when(repository.findDistinctChatIdsByLectureId(lectureId)).thenReturn(Arrays.asList(100L));

        ClarityResult result = service.getClarityResult(lectureId);

        assertThat(result.clarityRating()).isEqualTo(0.0);
    }

    @Test
    void getClarityResult_calculatesQuestionDensity() {
        Long lectureId = 1L;
        XapiEvent question1 = createAskedEvent(lectureId, 1L, "Вопрос 1?");
        XapiEvent question2 = createAskedEvent(lectureId, 2L, "Вопрос 2?");

        when(repository.findByLectureId(lectureId)).thenReturn(Arrays.asList(question1, question2));
        when(repository.findDistinctSlideIdsByLectureId(lectureId)).thenReturn(Arrays.asList(1L, 2L));
        when(repository.findDistinctChatIdsByLectureId(lectureId)).thenReturn(Arrays.asList(100L));

        ClarityResult result = service.getClarityResult(lectureId);

        assertThat(result.questionDensity()).isEqualTo(1.0);
    }

    @Test
    void getClarityResult_questionDensityWithMultipleStudents() {
        Long lectureId = 1L;
        XapiEvent question1 = new XapiEvent("asked", lectureId);
        question1.setSlideId(1L);
        question1.setChatId(100L);

        XapiEvent question2 = new XapiEvent("asked", lectureId);
        question2.setSlideId(1L);
        question2.setChatId(200L);

        when(repository.findByLectureId(lectureId)).thenReturn(Arrays.asList(question1, question2));
        when(repository.findDistinctSlideIdsByLectureId(lectureId)).thenReturn(List.of(1L));
        when(repository.findDistinctChatIdsByLectureId(lectureId)).thenReturn(Arrays.asList(100L, 200L));

        ClarityResult result = service.getClarityResult(lectureId);

        assertThat(result.questionDensity()).isEqualTo(1.0);
    }

    @Test
    void getClarityResult_calculatesQuestionTemporalDepth() {
        Long lectureId = 1L;
        Instant now = Instant.now();

        XapiEvent slideShown = new XapiEvent("slide_shown", lectureId);
        slideShown.setSlideId(1L);
        slideShown.setTimestamp(now);

        XapiEvent question = new XapiEvent("asked", lectureId);
        question.setSlideId(1L);
        question.setTimestamp(now.plusSeconds(60));

        when(repository.findByLectureId(lectureId)).thenReturn(Arrays.asList(slideShown, question));
        when(repository.findDistinctSlideIdsByLectureId(lectureId)).thenReturn(List.of(1L));
        when(repository.findDistinctChatIdsByLectureId(lectureId)).thenReturn(List.of(100L));

        ClarityResult result = service.getClarityResult(lectureId);

        assertThat(result.questionTemporalDepth()).isEqualTo(60.0);
    }

    @Test
    void getClarityResult_noSlideShownEvents_returnsZeroTemporalDepth() {
        Long lectureId = 1L;
        XapiEvent question = createAskedEvent(lectureId, 1L, "Вопрос?");

        when(repository.findByLectureId(lectureId)).thenReturn(List.of(question));
        when(repository.findDistinctSlideIdsByLectureId(lectureId)).thenReturn(List.of(1L));
        when(repository.findDistinctChatIdsByLectureId(lectureId)).thenReturn(List.of(100L));

        ClarityResult result = service.getClarityResult(lectureId);

        assertThat(result.questionTemporalDepth()).isEqualTo(0.0);
    }

    private XapiEvent createRatedEvent(Long lectureId, Long slideId, int rating) {
        XapiEvent event = new XapiEvent("rated", lectureId);
        event.setSlideId(slideId);
        event.setRating(rating);
        return event;
    }

    private XapiEvent createAskedEvent(Long lectureId, Long slideId, String question) {
        XapiEvent event = new XapiEvent("asked", lectureId);
        event.setSlideId(slideId);
        event.setQuestionText(question);
        event.setChatId(100L);
        return event;
    }
}
