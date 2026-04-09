package ru.university.lecturebroadcasting.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

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
            String url = analyticsServiceUrl + "/analytics/slide-changed";
            restTemplate.postForObject(url, Map.of("lectureId", lectureId, "slideNumber", slideNumber), Void.class);
        } catch (Exception e) {
            // analytics is non-critical — log and continue
            System.err.println("Failed to send slide-changed event to analytics: " + e.getMessage());
        }
    }
}