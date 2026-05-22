package ru.university.analyticsservice.xapi.service;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import ru.university.analyticsservice.xapi.entity.XapiEvent;
import ru.university.analyticsservice.xapi.repository.XapiEventRepository;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ClarityMetricsService {
    private final MeterRegistry meterRegistry;
    private final XapiEventRepository repository;
    private final ConcurrentHashMap<Long, Boolean> registeredLectures = new ConcurrentHashMap<>();

    public ClarityMetricsService(MeterRegistry meterRegistry, XapiEventRepository repository) {
        this.meterRegistry = meterRegistry;
        this.repository = repository;
    }

    @PostConstruct
    public void restoreMetricsOnStartup() {
        repository.findAll().stream()
            .map(XapiEvent::getLectureId)
            .distinct()
            .forEach(this::updateMetrics);
    }

    public void updateMetrics(Long lectureId) {
        if (!registeredLectures.containsKey(lectureId)) {
            registerMetrics(lectureId);
            registeredLectures.put(lectureId, true);
        }
    }

    private void registerMetrics(Long lectureId) {
        // Clarity Rating Gauge
        Gauge.builder("lecture.clarity.rating", () -> calculateClarityRating(lectureId))
            .tag("lecture_id", lectureId.toString())
            .description("Average clarity rating for a lecture")
            .register(meterRegistry);

        // Question Density Gauge
        Gauge.builder("lecture.question.density", () -> calculateQuestionDensity(lectureId))
            .tag("lecture_id", lectureId.toString())
            .description("Questions per slide per active listener")
            .register(meterRegistry);

        // Question Temporal Depth Gauge
        Gauge.builder("lecture.question.temporal.depth", () -> calculateQuestionTemporalDepth(lectureId))
            .tag("lecture_id", lectureId.toString())
            .description("Average time between slide appearance and question (seconds)")
            .register(meterRegistry);
    }

    private Double calculateClarityRating(Long lectureId) {
        return repository.findByLectureIdAndVerb(lectureId, "rated").stream()
            .mapToInt(e -> e.getRating() != null ? e.getRating() : 0)
            .average()
            .orElse(0.0);
    }

    private Double calculateQuestionDensity(Long lectureId) {
        long questionsCount = repository.findByLectureIdAndVerb(lectureId, "asked").size();

        if (questionsCount == 0) {
            return 0.0;
        }

        long distinctSlides = repository.findDistinctSlideIdsByLectureId(lectureId).size();
        long distinctStudents = repository.findDistinctChatIdsByLectureId(lectureId).size();

        long denominator = distinctSlides * distinctStudents;
        if (denominator == 0) {
            return 0.0;
        }

        return (double) questionsCount / denominator;
    }

    private Double calculateQuestionTemporalDepth(Long lectureId) {
        List<XapiEvent> questions = repository.findByLectureIdAndVerb(lectureId, "asked").stream()
            .filter(e -> e.getSlideId() != null)
            .sorted(Comparator.comparing(XapiEvent::getTimestamp))
            .collect(Collectors.toList());

        List<XapiEvent> slideShownEvents = repository.findByLectureIdAndVerbOrderByTimestampAsc(lectureId, "slide_shown").stream()
            .filter(e -> e.getSlideId() != null)
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
