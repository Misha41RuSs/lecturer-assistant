package ru.university.contentservice.service;

import ru.university.contentservice.entity.Slide;
import ru.university.contentservice.entity.SlideSequence;
import ru.university.contentservice.repository.SlideRepository;
import ru.university.contentservice.repository.SlideSequenceRepository;
import ru.university.contentservice.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

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
        SlideSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));
        
        List<UUID> slideIds = sequence.getSlides();
        if (slideIndex < 1 || slideIndex > slideIds.size()) {
            throw new RuntimeException("Slide index out of bounds: " + slideIndex);
        }
        
        UUID slideId = slideIds.get(slideIndex - 1);
        return getSlide(slideId);
    }
}
