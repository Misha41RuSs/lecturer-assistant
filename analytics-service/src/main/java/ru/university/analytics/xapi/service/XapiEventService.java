package ru.university.analytics.xapi.service;

import org.springframework.stereotype.Service;
import ru.university.analytics.xapi.dto.ClarityResult;
import ru.university.analytics.xapi.dto.XapiEventRequest;
import ru.university.analytics.xapi.entity.XapiEvent;
import ru.university.analytics.xapi.repository.XapiEventRepository;

import java.util.List;

@Service
public class XapiEventService {
    private final XapiEventRepository repository;
    private final ClarityMetricsService metricsService;

    public XapiEventService(XapiEventRepository repository, ClarityMetricsService metricsService) {
        this.repository = repository;
        this.metricsService = metricsService;
    }

    public void recordEvent(XapiEventRequest request) {
        XapiEvent event = new XapiEvent(request.verb(), request.lectureId());
        event.setSlideId(request.slideId());
        event.setChatId(request.chatId());
        event.setRating(request.rating());
        event.setQuestionText(request.questionText());
        event.setQuizId(request.quizId());
        event.setAnswer(request.answer());
        event.setIsCorrect(request.isCorrect());

        repository.save(event);

        // Register or update Micrometer metrics
        metricsService.updateMetrics(request.lectureId());
    }

    public ClarityResult getClarityResult(Long lectureId) {
        List<XapiEvent> allEvents = repository.findByLectureId(lectureId);

        Double cr = calculateClarityRating(allEvents);
        Double qd = calculateQuestionDensity(lectureId, allEvents);
        Double qtd = calculateQuestionTemporalDepth(allEvents);

        return new ClarityResult(lectureId, cr, qd, qtd);
    }

    private Double calculateClarityRating(List<XapiEvent> events) {
        return events.stream()
            .filter(e -> "rated".equals(e.getVerb()) && e.getRating() != null)
            .mapToInt(XapiEvent::getRating)
            .average()
            .orElse(0.0);
    }

    private Double calculateQuestionDensity(Long lectureId, List<XapiEvent> allEvents) {
        long questionsCount = allEvents.stream()
            .filter(e -> "asked".equals(e.getVerb()))
            .count();

        if (questionsCount == 0) {
            return 0.0;
        }

        List<Long> distinctSlides = repository.findDistinctSlideIdsByLectureId(lectureId);
        List<Long> distinctStudents = repository.findDistinctChatIdsByLectureId(lectureId);

        long denominator = (long) distinctSlides.size() * distinctStudents.size();
        if (denominator == 0) {
            return 0.0;
        }

        return (double) questionsCount / denominator;
    }

    private Double calculateQuestionTemporalDepth(List<XapiEvent> events) {
        // For MVP: return 0.0
        // In future: calculate average time between slide appearance and question
        return 0.0;
    }
}
