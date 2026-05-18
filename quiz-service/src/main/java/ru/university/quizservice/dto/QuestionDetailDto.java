package ru.university.quizservice.dto;

import java.util.List;
import java.util.UUID;

public record QuestionDetailDto(
        UUID id,
        Long lectureId,
        String text,
        String type,
        Integer timeLimitSec,
        List<OptionDto> options
) {
    public record OptionDto(UUID id, String text, boolean correct) {}
}
