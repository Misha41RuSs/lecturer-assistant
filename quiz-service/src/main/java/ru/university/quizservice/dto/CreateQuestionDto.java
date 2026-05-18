package ru.university.quizservice.dto;

import java.util.List;

public record CreateQuestionDto(
        Long lectureId,
        String text,
        String type,
        Integer timeLimitSec,
        List<OptionDto> options
) {
    public record OptionDto(String text, boolean correct) {}
}
