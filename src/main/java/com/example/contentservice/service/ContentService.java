package com.example.contentservice.service;

import com.example.contentservice.entity.Slide;
import com.example.contentservice.repository.SlideRepository;
import com.example.contentservice.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ContentService {

    private final SlideRepository slideRepository;
    private final FileStorageService storageService;

    // Получение слайда по id
    public byte[] getSlide(UUID slideId) throws IOException {
        Slide slide = slideRepository.findById(slideId)
                .orElseThrow(() -> new RuntimeException("Slide not found"));
        return storageService.loadFile(slide.getFilePath());
    }
}