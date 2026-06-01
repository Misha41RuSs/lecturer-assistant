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
import org.springframework.transaction.annotation.Transactional;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.entity.QuestionUpvote;
import ru.university.lecturebroadcasting.entity.StudentQuestionEntity;
import ru.university.lecturebroadcasting.repository.LectureRepository;
import ru.university.lecturebroadcasting.repository.QuestionUpvoteRepository;
import ru.university.lecturebroadcasting.repository.StudentQuestionRepository;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class StudentQuestionService {
    private static final Logger logger = LoggerFactory.getLogger(StudentQuestionService.class);

    public record Question(String id, Long lectureId, Long chatId, String text,
                           String answer, String status, Instant createdAt, boolean anonymous, int upvotes) {
        Question withAnswer(String ans) {
            return new Question(id, lectureId, chatId, text, ans, "ANSWERED", createdAt, anonymous, upvotes);
        }

        Question seen() {
            return new Question(id, lectureId, chatId, text, answer, "SEEN", createdAt, anonymous, upvotes);
        }

        Question dismissed() {
            return new Question(id, lectureId, chatId, text, answer, "DISMISSED", createdAt, anonymous, upvotes);
        }

        Question withUpvotes(int value) {
            return new Question(id, lectureId, chatId, text, answer, status, createdAt, anonymous, value);
        }
    }

    private final RestTemplate restTemplate;
    private final String analyticsServiceUrl;
    private final SimpMessagingTemplate messagingTemplate;
    private final LectureRepository lectureRepository;
    private final StudentQuestionRepository questionRepository;
    private final QuestionUpvoteRepository upvoteRepository;

    public StudentQuestionService(RestTemplate restTemplate,
                                  @Value("${analytics-service.url}") String analyticsServiceUrl,
                                  SimpMessagingTemplate messagingTemplate,
                                  LectureRepository lectureRepository,
                                  StudentQuestionRepository questionRepository,
                                  QuestionUpvoteRepository upvoteRepository) {
        this.restTemplate = restTemplate;
        this.analyticsServiceUrl = analyticsServiceUrl;
        this.messagingTemplate = messagingTemplate;
        this.lectureRepository = lectureRepository;
        this.questionRepository = questionRepository;
        this.upvoteRepository = upvoteRepository;
    }

    @Transactional
    public Question add(Long lectureId, Long chatId, String text, Long slideId, boolean anonymous) {
        Lecture lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + lectureId));
        StudentQuestionEntity entity = new StudentQuestionEntity();
        entity.setLecture(lecture);
        entity.setChatId(chatId);
        entity.setText(text);
        entity.setAnonymous(anonymous);
        StudentQuestionEntity saved = questionRepository.save(entity);
        Question q = toQuestion(saved);

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

    @Transactional(readOnly = true)
    public List<Question> getByLecture(Long lectureId) {
        Map<UUID, Integer> upvotesByQuestion = upvoteCounts(lectureId);
        return questionRepository.findByLecture_Id(lectureId).stream()
                .map(entity -> toQuestion(entity, upvotesByQuestion))
                .sorted(Comparator.comparing(Question::status).thenComparing(Comparator.comparing(Question::upvotes).reversed()).thenComparing(Question::createdAt))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Question> topOpen(Long lectureId, int limit) {
        Map<UUID, Integer> upvotesByQuestion = upvoteCounts(lectureId);
        return questionRepository.findByLecture_Id(lectureId).stream()
                .map(entity -> toQuestion(entity, upvotesByQuestion))
                .filter(q -> !"ANSWERED".equals(q.status()) && !"DISMISSED".equals(q.status()))
                .sorted(Comparator.comparing(Question::upvotes).reversed().thenComparing(Question::createdAt))
                .limit(limit)
                .toList();
    }

    @Transactional
    public Optional<Question> upvote(String id, Long chatId) {
        UUID uuid = UUID.fromString(id);
        return questionRepository.findById(uuid).map(question -> {
            upvoteRepository.findByQuestion_IdAndChatId(uuid, chatId).orElseGet(() -> {
                QuestionUpvote upvote = new QuestionUpvote();
                upvote.setQuestion(question);
                upvote.setChatId(chatId);
                return upvoteRepository.save(upvote);
            });
            publishQuestionChange(question.getLecture().getId());
            return toQuestion(question);
        });
    }

    @Transactional(readOnly = true)
    public Set<Long> subscribers(String id) {
        UUID uuid = UUID.fromString(id);
        Set<Long> result = new HashSet<>();
        questionRepository.findById(uuid).ifPresent(q -> result.add(q.getChatId()));
        upvoteRepository.findByQuestion_Id(uuid).forEach(upvote -> result.add(upvote.getChatId()));
        return result;
    }

    @Transactional
    public List<Question> markOpenAsSeen(Long lectureId) {
        List<Question> seenQuestions = questionRepository.findByLecture_IdAndStatus(lectureId, "OPEN").stream()
                .map(q -> {
                    q.setStatus("SEEN");
                    return toQuestion(questionRepository.save(q));
                })
                .toList();
        if (!seenQuestions.isEmpty()) {
            publishQuestionChange(lectureId);
        }
        return seenQuestions;
    }

    @Transactional
    public Optional<Question> answer(String id, String answer) {
        return questionRepository.findById(UUID.fromString(id)).map(q -> {
            q.setAnswer(answer);
            q.setStatus("ANSWERED");
            Question answered = toQuestion(questionRepository.save(q));
            publishQuestionChange(answered.lectureId());
            return answered;
        });
    }

    @Transactional
    public Optional<Question> dismiss(String id) {
        return questionRepository.findById(UUID.fromString(id)).map(q -> {
            q.setStatus("DISMISSED");
            Question dismissed = toQuestion(questionRepository.save(q));
            publishQuestionChange(dismissed.lectureId());
            return dismissed;
        });
    }

    private void publishQuestionChange(Long lectureId) {
        messagingTemplate.convertAndSend(
                "/topic/student-questions/" + lectureId,
                Map.of("type", "QUESTIONS_CHANGED", "lectureId", lectureId)
        );
    }

    @Transactional
    public void clearByLecture(Long lectureId) {
        upvoteRepository.deleteByQuestion_Lecture_Id(lectureId);
        questionRepository.deleteByLecture_Id(lectureId);
    }

    private Map<UUID, Integer> upvoteCounts(Long lectureId) {
        Map<UUID, Integer> counts = new HashMap<>();
        for (Object[] row : upvoteRepository.countByLectureId(lectureId)) {
            counts.put((UUID) row[0], ((Number) row[1]).intValue());
        }
        return counts;
    }

    private Question toQuestion(StudentQuestionEntity entity) {
        return toQuestion(entity, Map.of(entity.getId(), (int) upvoteRepository.countByQuestion_Id(entity.getId())));
    }

    private Question toQuestion(StudentQuestionEntity entity, Map<UUID, Integer> upvotesByQuestion) {
        return new Question(
                entity.getId().toString(),
                entity.getLecture().getId(),
                entity.getChatId(),
                entity.getText(),
                entity.getAnswer(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.isAnonymous(),
                upvotesByQuestion.getOrDefault(entity.getId(), 0)
        );
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
