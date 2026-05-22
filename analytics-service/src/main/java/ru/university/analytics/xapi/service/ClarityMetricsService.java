package ru.university.analytics.xapi.service;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;
import ru.university.analytics.xapi.repository.XapiEventRepository;

import java.util.concurrent.ConcurrentHashMap;

@Service
public class ClarityMetricsService {
    private final MeterRegistry meterRegistry;
    private final XapiEventRepository repository;
    private final ConcurrentHashMap<Long, Boolean> registeredLectures = new ConcurrentHashMap<>();

    public ClarityMetricsService(MeterRegistry meterRegistry, XapiEventRepository repository) {
        this.meterRegistry = meterRegistry;
        this.repository = repository;
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
        // MVP: return 0.0
        return 0.0;
    }
}
