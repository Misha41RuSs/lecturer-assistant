package ru.university.lecturebroadcasting.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class AnalyticsServiceClient {

    private final RestTemplate restTemplate;
    private final String analyticsServiceUrl;

    public AnalyticsServiceClient(@Value("${analytics-service.url}") String analyticsServiceUrl) {
        this.restTemplate = new RestTemplate();
        this.analyticsServiceUrl = analyticsServiceUrl;
    }

    @Async
    public void sendSlideChangedEvent(Long lectureId, int slideNumber) {
        try {
            String url = analyticsServiceUrl + "/analytics/events/lecture";
            Map<String, String> body = new HashMap<>();
            body.put("lectureId", String.valueOf(lectureId));
            body.put("actionType", "slide_changed");
            body.put("payload", "{\"slideNumber\":" + slideNumber + "}");
            restTemplate.postForObject(url, body, Void.class);
        } catch (Exception e) {
            System.err.println("Failed to send slide-changed event to analytics: " + e.getMessage());
        }
    }

    @Async
    public void sendStudentJoinedEvent(Long lectureId) {
        try {
            String url = analyticsServiceUrl + "/analytics/events/lecture";
            Map<String, String> body = new HashMap<>();
            body.put("lectureId", String.valueOf(lectureId));
            body.put("actionType", "student_joined");
            restTemplate.postForObject(url, body, Void.class);
        } catch (Exception e) {
            System.err.println("Failed to send student_joined event to analytics: " + e.getMessage());
        }
    }
}