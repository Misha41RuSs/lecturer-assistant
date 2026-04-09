package ru.university.lecturebroadcasting.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class ContentServiceClient {

    private final RestTemplate restTemplate;
    private final String contentServiceUrl;

    public ContentServiceClient(@Value("${content-service.url}") String contentServiceUrl) {
        this.restTemplate = new RestTemplate();
        this.contentServiceUrl = contentServiceUrl;
    }

    public byte[] getSlideImage(java.util.UUID sequenceId, int slideNumber) {
        try {
            if (sequenceId == null) {
                System.err.println("SequenceId is null, cannot fetch slide");
                return null;
            }
            String url = contentServiceUrl + "/slide-sequences/" + sequenceId + "/slide/" + slideNumber;
            return restTemplate.getForObject(url, byte[].class);
        } catch (Exception e) {
            System.err.println("content-service unavailable, slide image skipped: " + e.getMessage());
            return null;
        }
    }
}