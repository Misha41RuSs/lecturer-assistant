package com.example.contentservice.service;

import com.example.contentservice.entity.Slide;
import com.example.contentservice.entity.SlideSequence;
import com.example.contentservice.parser.PdfParserService;
import com.example.contentservice.parser.PptxParserService;
import com.example.contentservice.repository.SlideRepository;
import com.example.contentservice.repository.SlideSequenceRepository;
import com.example.contentservice.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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
        if (filename == null) throw new RuntimeException("Filename is null");

        List<BufferedImage> images;
        if (filename.endsWith(".pdf")) {
            images = pdfParser.parse(file);
        } else if (filename.endsWith(".pptx")) {
            images = pptxParser.parse(file);
        } else {
            throw new RuntimeException("Unsupported file type: " + filename);
        }

        UUID sequenceId = UUID.randomUUID();
        List<UUID> slideIds = new ArrayList<>();

        for (int i = 0; i < images.size(); i++) {
            String slideFileName = sequenceId + "_slide_" + (i + 1) + ".png";

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(images.get(i), "png", baos);
            byte[] bytes = baos.toByteArray();

            String path = fileStorage.saveFile(bytes, slideFileName);

            Slide slide = Slide.builder()
                    .id(UUID.randomUUID())
                    .title("Slide " + (i + 1))
                    .filePath(path)
                    .version(1)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            slideRepository.save(slide);
            slideIds.add(slide.getId());
        }

        SlideSequence sequence = SlideSequence.builder()
                .id(sequenceId)
                .name(filename)
                .slides(slideIds)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        sequenceRepository.save(sequence);
        return new UploadResult(sequenceId, images.size());
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