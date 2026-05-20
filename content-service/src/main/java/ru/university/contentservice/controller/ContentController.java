package ru.university.contentservice.controller;

import ru.university.contentservice.entity.SlideSequence;
import ru.university.contentservice.service.ContentService;
import ru.university.contentservice.service.ContentUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
public class ContentController {

    private final ContentService contentService;
    private final ContentUploadService uploadService;

    @GetMapping("/slides/{slideId}")
    public ResponseEntity<byte[]> getSlide(@PathVariable UUID slideId) throws IOException {
        byte[] file = contentService.getSlide(slideId);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header("Cache-Control", "public, max-age=3600, immutable")
                .header("Access-Control-Allow-Origin", "*")
                .body(file);
    }

    @PostMapping("/presentations/upload")
    public ResponseEntity<?> uploadPresentation(@RequestParam("file") MultipartFile file) {
        try {
            ContentUploadService.UploadResult result = uploadService.uploadPresentation(file);
            return ResponseEntity.ok(Map.of("sequenceId", result.sequenceId(), "slideCount", result.slideCount()));
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Upload failed: " + e.getMessage());
        }
    }

    @PostMapping("/slides/{slideId}/media")
    public ResponseEntity<?> uploadMedia(@PathVariable UUID slideId,
                                         @RequestParam("file") MultipartFile file) {
        try {
            uploadService.attachMedia(slideId, file);
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Media upload failed: " + e.getMessage());
        }
    }

    @PutMapping("/slide-sequences/{sequenceId}")
    public ResponseEntity<?> updateSequence(@PathVariable UUID sequenceId,
                                            @RequestBody java.util.List<UUID> slideIds) {
        SlideSequence updated = uploadService.updateSequence(sequenceId, slideIds);
        return ResponseEntity.ok(Map.of("sequenceId", updated.getId()));
    }

    @GetMapping("/slide-sequences/{sequenceId}/slide/{slideIndex}")
    public ResponseEntity<byte[]> getSlideByIndex(@PathVariable UUID sequenceId, @PathVariable int slideIndex) throws IOException {
        log.info("GET request for slide: sequenceId={} slideIndex={}", sequenceId, slideIndex);
        try {
            byte[] file = contentService.getSlideByIndex(sequenceId, slideIndex);
            log.info("Returning slide: sequenceId={} slideIndex={} size={} bytes", sequenceId, slideIndex, file.length);
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .header("Cache-Control", "public, max-age=3600, immutable")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(file);
        } catch (Exception e) {
            log.error("Failed to get slide: sequenceId={} slideIndex={} error={}", sequenceId, slideIndex, e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/slide-sequences/{sequenceId}/slides")
    public ResponseEntity<?> getSlidesMeta(@PathVariable UUID sequenceId) {
        return ResponseEntity.ok(contentService.getSlidesMeta(sequenceId));
    }

    @GetMapping("/slide-sequences/{sequenceId}")
    public ResponseEntity<?> getSequence(@PathVariable UUID sequenceId) {
        return ResponseEntity.ok(uploadService.getSequence(sequenceId));
    }
}
