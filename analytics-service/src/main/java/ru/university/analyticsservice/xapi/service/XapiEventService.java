package ru.university.analyticsservice.xapi.service;

import org.springframework.stereotype.Service;
import ru.university.analyticsservice.xapi.dto.ClarityResult;
import ru.university.analyticsservice.xapi.dto.XapiEventRequest;
import ru.university.analyticsservice.xapi.entity.XapiEvent;
import ru.university.analyticsservice.xapi.repository.XapiEventRepository;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

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
        List<XapiEvent> questions = events.stream()
            .filter(e -> "asked".equals(e.getVerb()) && e.getSlideId() != null)
            .sorted(Comparator.comparing(XapiEvent::getTimestamp))
            .collect(Collectors.toList());

        List<XapiEvent> slideShownEvents = events.stream()
            .filter(e -> "slide_shown".equals(e.getVerb()) && e.getSlideId() != null)
            .sorted(Comparator.comparing(XapiEvent::getTimestamp))
            .collect(Collectors.toList());

        if (questions.isEmpty() || slideShownEvents.isEmpty()) {
            return 0.0;
        }

        List<Double> depths = new ArrayList<>();
        for (XapiEvent question : questions) {
            for (int i = slideShownEvents.size() - 1; i >= 0; i--) {
                XapiEvent slideEvent = slideShownEvents.get(i);
                if (slideEvent.getSlideId().equals(question.getSlideId())
                    && slideEvent.getTimestamp().isBefore(question.getTimestamp())) {
                    long seconds = Duration.between(slideEvent.getTimestamp(), question.getTimestamp()).getSeconds();
                    if (seconds > 0) {
                        depths.add((double) seconds);
                    }
                    break;
                }
            }
        }

        return depths.isEmpty() ? 0.0 : depths.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }
}
