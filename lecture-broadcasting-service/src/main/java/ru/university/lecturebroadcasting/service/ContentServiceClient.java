package ru.university.lecturebroadcasting.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
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
                log.error("SequenceId is null, cannot fetch slide");
                return null;
            }
            String url = contentServiceUrl + "/slide-sequences/" + sequenceId + "/slide/" + slideNumber;
            return restTemplate.getForObject(url, byte[].class);
        } catch (Exception e) {
            log.error("Failed to get slide image from content-service: url={}, sequenceId={}, slideNumber={}, error={}",
                    contentServiceUrl + "/slide-sequences/" + sequenceId + "/slide/" + slideNumber,
                    sequenceId, slideNumber, e.getMessage());
            return null;
        }
    }
}