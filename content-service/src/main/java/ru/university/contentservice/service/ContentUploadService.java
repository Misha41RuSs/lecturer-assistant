package ru.university.contentservice.service;

import ru.university.contentservice.entity.Slide;
import ru.university.contentservice.entity.SlideSequence;
import ru.university.contentservice.parser.PdfParserService;
import ru.university.contentservice.parser.PptxParserService;
import ru.university.contentservice.repository.SlideRepository;
import ru.university.contentservice.repository.SlideSequenceRepository;
import ru.university.contentservice.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContentUploadService {

    private final PdfParserService pdfParser;
    private final PptxParserService pptxParser;
    private final FileStorageService fileStorage;
    private final SlideRepository slideRepository;
    private final SlideSequenceRepository sequenceRepository;

    public record UploadResult(UUID sequenceId, int slideCount) {}

    public UploadResult uploadPresentation(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        log.info("Upload started for file: {}, size: {} bytes", filename, file.getSize());

        if (filename == null) throw new RuntimeException("Filename is null");

        // Parsers return PNG bytes directly, encoding and chunking handled internally
        List<byte[]> encodedSlides;
        try {
            if (filename.endsWith(".pdf")) {
                log.info("Detected PDF file, starting parsing");
                encodedSlides = pdfParser.parse(file);
            } else if (filename.endsWith(".pptx")) {
                log.info("Detected PPTX file, starting parsing");
                encodedSlides = pptxParser.parse(file);
            } else {
                log.error("Unsupported file type: {}", filename);
                throw new RuntimeException("Unsupported file type: " + filename);
            }
        } catch (Exception e) {
            log.error("Parsing failed for file: {}", filename, e);
            throw e;
        }

        log.info("Parsing completed. Parsed {} slides", encodedSlides.size());

        UUID sequenceId = UUID.randomUUID();
        List<UUID> slideIds = new ArrayList<>(encodedSlides.size());
        List<Slide> slides = new ArrayList<>(encodedSlides.size());

        log.info("Starting to save {} slides to storage", encodedSlides.size());
        for (int i = 0; i < encodedSlides.size(); i++) {
            try {
                String slideFileName = sequenceId + "_slide_" + (i + 1) + ".png";
                String path = fileStorage.saveFile(encodedSlides.get(i), slideFileName);
                UUID slideId = UUID.randomUUID();
                slides.add(Slide.builder()
                        .id(slideId)
                        .title("Slide " + (i + 1))
                        .filePath(path)
                        .version(1)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build());
                slideIds.add(slideId);
                log.debug("Slide {} saved: {}", i + 1, path);
            } catch (Exception e) {
                log.error("Failed to save slide {}", i + 1, e);
                throw new RuntimeException("Failed to save slide " + (i + 1), e);
            }
        }

        log.info("All slides saved, saving to database");
        slideRepository.saveAll(slides);

        SlideSequence sequence = SlideSequence.builder()
                .id(sequenceId)
                .name(filename)
                .slides(slideIds)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        sequenceRepository.save(sequence);
        log.info("Upload completed successfully. Sequence ID: {}, slides: {}", sequenceId, encodedSlides.size());
        return new UploadResult(sequenceId, encodedSlides.size());
    }

    public void attachMedia(UUID slideId, MultipartFile file) throws IOException {
        Slide slide = slideRepository.findById(slideId)
                .orElseThrow(() -> new RuntimeException("Slide not found: " + slideId));

        String filename = slideId + "_media_" + file.getOriginalFilename();
        String path = fileStorage.saveFile(file.getBytes(), filename);

        slide.setFilePath(path);
        slide.setUpdatedAt(LocalDateTime.now());
        slideRepository.save(slide);
    }

    public SlideSequence updateSequence(UUID sequenceId, List<UUID> slideIds) {
        SlideSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found: " + sequenceId));
        sequence.setSlides(slideIds);
        sequence.setUpdatedAt(LocalDateTime.now());
        return sequenceRepository.save(sequence);
    }

    public SlideSequence getSequence(UUID sequenceId) {
        return sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found: " + sequenceId));
    }
}
