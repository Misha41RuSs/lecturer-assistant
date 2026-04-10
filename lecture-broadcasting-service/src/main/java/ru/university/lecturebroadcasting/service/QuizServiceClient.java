package ru.university.lecturebroadcasting.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class QuizServiceClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String baseUrl;

    public QuizServiceClient(@Value("${quiz-service.url}") String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public ExamDetail getExam(UUID examId) {
        try {
            return restTemplate.getForObject(baseUrl + "/exams/" + examId, ExamDetail.class);
        } catch (Exception e) {
            log.error("getExam failed: {}", e.getMessage());
            return null;
        }
    }

    public List<ExamSummary> getExamsByLecture(UUID lectureId) {
        try {
            ResponseEntity<List<ExamSummary>> resp = restTemplate.exchange(
                    baseUrl + "/lectures/" + lectureId + "/exams",
                    HttpMethod.GET, null,
                    new ParameterizedTypeReference<>() {});
            return resp.getBody();
        } catch (Exception e) {
            log.error("getExamsByLecture failed: {}", e.getMessage());
            return List.of();
        }
    }

    public ExamDetail startSubmission(UUID examId, Long chatId) {
        try {
            HttpEntity<Map<String, Object>> req = jsonEntity(Map.of("chatId", chatId));
            return restTemplate.postForObject(baseUrl + "/exams/" + examId + "/submissions", req, ExamDetail.class);
        } catch (Exception e) {
            log.error("startSubmission failed examId={} chatId={}: {}", examId, chatId, e.getMessage());
            return null;
        }
    }

    public void submitAnswer(UUID examId, Long chatId, UUID questionId,
                             UUID selectedOptionId, String openText) {
        try {
            Map<String, Object> body = new java.util.HashMap<>();
            body.put("questionId", questionId.toString());
            if (selectedOptionId != null) body.put("selectedOptionId", selectedOptionId.toString());
            if (openText != null) body.put("openText", openText);

            HttpEntity<Map<String, Object>> req = jsonEntity(body);
            restTemplate.postForObject(
                    baseUrl + "/exams/" + examId + "/answers?chatId=" + chatId,
                    req, Object.class);
        } catch (Exception e) {
            log.error("submitAnswer failed: {}", e.getMessage());
        }
    }

    public List<SubmissionResult> getSubmissions(UUID examId) {
        try {
            ResponseEntity<List<SubmissionResult>> resp = restTemplate.exchange(
                    baseUrl + "/exams/" + examId + "/submissions",
                    HttpMethod.GET, null,
                    new ParameterizedTypeReference<>() {});
            return resp.getBody();
        } catch (Exception e) {
            log.error("getSubmissions failed: {}", e.getMessage());
            return List.of();
        }
    }

    private <T> HttpEntity<T> jsonEntity(T body) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, h);
    }

    public record ExamSummary(String id, String title, Integer totalTimeSec, String status, int questionCount) {}

    public record ExamDetail(
            String id, String lectureId, String title,
            Integer totalTimeSec, String status,
            List<Question> questions) {

        public record Question(String id, int orderIndex, String text, String type,
                               Integer timeLimitSec, List<Option> options) {}

        public record Option(String id, String text) {}
    }

    public record SubmissionResult(String submissionId, Long chatId,
                                   int totalScore, int maxScore, boolean hasUngraded) {}
}