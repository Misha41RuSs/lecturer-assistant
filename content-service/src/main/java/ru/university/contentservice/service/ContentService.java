package ru.university.contentservice.service;

import ru.university.contentservice.entity.Slide;
import ru.university.contentservice.entity.SlideSequence;
import ru.university.contentservice.repository.SlideRepository;
import ru.university.contentservice.repository.SlideSequenceRepository;
import ru.university.contentservice.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Slf4j

@Service
@RequiredArgsConstructor
public class ContentService {

    private final SlideRepository slideRepository;
    private final SlideSequenceRepository sequenceRepository;
    private final FileStorageService storageService;

    // Получение слайда по id
    public byte[] getSlide(UUID slideId) throws IOException {
        Slide slide = slideRepository.findById(slideId)
                .orElseThrow(() -> new RuntimeException("Slide not found"));
        return storageService.loadFile(slide.getFilePath());
    }

    // Получение слайда по индексу в последовательности (индекс начинается с 1)
    public byte[] getSlideByIndex(UUID sequenceId, int slideIndex) throws IOException {
        log.debug("Getting slide: sequenceId={} slideIndex={}", sequenceId, slideIndex);

        SlideSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> {
                    log.error("Sequence not found: sequenceId={}", sequenceId);
                    return new RuntimeException("Sequence not found");
                });

        List<UUID> slideIds = sequence.getSlides();
        log.debug("Sequence has {} slides", slideIds.size());

        if (slideIndex < 1 || slideIndex > slideIds.size()) {
            log.error("Slide index out of bounds: slideIndex={} sequenceSize={}", slideIndex, slideIds.size());
            throw new RuntimeException("Slide index out of bounds: " + slideIndex);
        }

        UUID slideId = slideIds.get(slideIndex - 1);
        log.debug("Loading slide file: slideId={} filePath will be retrieved", slideId);
        byte[] imageBytes = getSlide(slideId);
        log.info("Slide loaded successfully: sequenceId={} slideIndex={} slideId={} size={} bytes",
                sequenceId, slideIndex, slideId, imageBytes.length);
        return imageBytes;
    }
}
