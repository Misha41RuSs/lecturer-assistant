package ru.university.contentservice.service;

import ru.university.contentservice.dto.SlideMeta;
import ru.university.contentservice.dto.SlideMetaPatch;
import ru.university.contentservice.entity.Slide;
import ru.university.contentservice.entity.SlideSequence;
import ru.university.contentservice.repository.SlideRepository;
import ru.university.contentservice.repository.SlideSequenceRepository;
import ru.university.contentservice.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

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

    public List<SlideMeta> getSlidesMeta(UUID sequenceId) {
        SlideSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        List<UUID> ids = sequence.getSlides();
        Map<UUID, Slide> byId = slideRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Slide::getId, Function.identity()));

        return ids.stream()
                .filter(byId::containsKey)
                .map(id -> {
                    Slide s = byId.get(id);
                    return new SlideMeta(s.getId(),
                            s.getTitle() != null ? s.getTitle() : "",
                            s.getNotes() != null ? s.getNotes() : "");
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public SlideMeta updateSlideMeta(UUID slideId, SlideMetaPatch patch) {
        Slide slide = slideRepository.findById(slideId)
                .orElseThrow(() -> new RuntimeException("Slide not found"));

        if (patch.title() != null) slide.setTitle(patch.title());
        if (patch.notes() != null) slide.setNotes(patch.notes());
        slide.setUpdatedAt(LocalDateTime.now());

        slideRepository.save(slide);
        return new SlideMeta(slide.getId(),
                slide.getTitle() != null ? slide.getTitle() : "",
                slide.getNotes() != null ? slide.getNotes() : "");
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
