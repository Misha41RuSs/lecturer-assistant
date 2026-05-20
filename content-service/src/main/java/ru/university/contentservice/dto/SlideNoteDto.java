package ru.university.contentservice.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** DTO для ответа (GET) */
public record SlideNoteDto(
        Long id,
        Long lectureId,
        UUID slideId,
        String text,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
