package ru.university.lecturebroadcasting.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class StudentQuestionService {
    private static final Logger logger = LoggerFactory.getLogger(StudentQuestionService.class);

    public record Question(String id, Long lectureId, Long chatId, String text,
                           String answer, String status, Instant createdAt) {
        Question withAnswer(String ans) {
            return new Question(id, lectureId, chatId, text, ans, "ANSWERED", createdAt);
        }

        Question seen() {
            return new Question(id, lectureId, chatId, text, answer, "SEEN", createdAt);
        }

        Question dismissed() {
            return new Question(id, lectureId, chatId, text, answer, "DISMISSED", createdAt);
        }
    }

    private final AtomicLong seq = new AtomicLong(1);
    private final ConcurrentHashMap<String, Question> store = new ConcurrentHashMap<>();
    private final RestTemplate restTemplate;
    private final String analyticsServiceUrl;
    private final SimpMessagingTemplate messagingTemplate;

    public StudentQuestionService(RestTemplate restTemplate,
                                  @Value("${analytics-service.url}") String analyticsServiceUrl,
                                  SimpMessagingTemplate messagingTemplate) {
        this.restTemplate = restTemplate;
        this.analyticsServiceUrl = analyticsServiceUrl;
        this.messagingTemplate = messagingTemplate;
    }

    public Question add(Long lectureId, Long chatId, String text, Long slideId) {
        String id = String.valueOf(seq.getAndIncrement());
        Question q = new Question(id, lectureId, chatId, text, null, "OPEN", Instant.now());
        store.put(id, q);

        // Отправляем xAPI событие "asked" для сбора метрик
        sendXapiQuestionEvent(lectureId, slideId, chatId, text);
        publishQuestionChange(lectureId);

        return q;
    }

    private void sendXapiQuestionEvent(Long lectureId, Long slideId, Long chatId, String questionText) {
        try {
            if (slideId == null) {
                logger.warn("Slide ID is null for question event, skipping xAPI event");
                return;
            }

            Map<String, Object> event = new HashMap<>();
            event.put("verb", "asked");
            event.put("lectureId", lectureId);
            event.put("slideId", slideId);
            event.put("chatId", chatId);
            event.put("questionText", questionText);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(event, headers);
            restTemplate.postForObject(analyticsServiceUrl + "/xapi/events", request, Void.class);
        } catch (Exception e) {
            logger.error("Failed to send xAPI question event: " + e.getMessage());
        }
    }

    public List<Question> getByLecture(Long lectureId) {
        return store.values().stream()
                .filter(q -> q.lectureId().equals(lectureId))
                .sorted(Comparator.comparing(Question::createdAt))
                .toList();
    }

    public List<Question> markOpenAsSeen(Long lectureId) {
        List<Question> seenQuestions = store.values().stream()
                .filter(q -> q.lectureId().equals(lectureId) && "OPEN".equals(q.status()))
                .map(q -> {
                    Question seen = q.seen();
                    store.put(q.id(), seen);
                    return seen;
                })
                .toList();
        if (!seenQuestions.isEmpty()) {
            publishQuestionChange(lectureId);
        }
        return seenQuestions;
    }

    public Optional<Question> answer(String id, String answer) {
        Question q = store.get(id);
        if (q == null) return Optional.empty();
        Question answered = q.withAnswer(answer);
        store.put(id, answered);
        publishQuestionChange(answered.lectureId());
        return Optional.of(answered);
    }

    public Optional<Question> dismiss(String id) {
        Question q = store.get(id);
        if (q == null) return Optional.empty();
        Question dismissed = q.dismissed();
        store.put(id, dismissed);
        publishQuestionChange(dismissed.lectureId());
        return Optional.of(dismissed);
    }

    private void publishQuestionChange(Long lectureId) {
        messagingTemplate.convertAndSend(
                "/topic/student-questions/" + lectureId,
                Map.of("type", "QUESTIONS_CHANGED", "lectureId", lectureId)
        );
    }

    public void clearByLecture(Long lectureId) {
        store.values().removeIf(q -> q.lectureId().equals(lectureId));
    }

    public void sendRating(Long lectureId, Long chatId, Integer rating, Long slideId) {
        try {
            if (slideId == null) {
                logger.warn("Slide ID is null for rating event, skipping xAPI event");
                return;
            }

            Map<String, Object> event = new HashMap<>();
            event.put("verb", "rated");
            event.put("lectureId", lectureId);
            event.put("slideId", slideId);
            event.put("chatId", chatId);
            event.put("rating", rating);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(event, headers);
            restTemplate.postForObject(analyticsServiceUrl + "/xapi/events", request, Void.class);
        } catch (Exception e) {
            logger.error("Failed to send xAPI rating event: " + e.getMessage());
        }
    }
}
